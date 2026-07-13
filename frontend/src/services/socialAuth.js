import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const DEV_MOCK_TOKEN = 'dev-mock-token';

/** 카카오 콘솔에 등록하는 https Redirect URI */
export function getOAuthRedirectUri(provider = 'kakao') {
  const override = process.env.EXPO_PUBLIC_KAKAO_REDIRECT_URI?.trim();
  if (override) {
    return override.replace(/\/$/, '');
  }

  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim().replace(/\/$/, '');
  if (apiUrl?.startsWith('https://')) {
    return `${apiUrl}/auth/${provider}/callback`;
  }

  return AuthSession.makeRedirectUri({
    scheme: 'catchup',
    path: 'oauth',
  });
}

/** Expo Go / 앱으로 돌아올 때 사용하는 주소 (exp:// 또는 catchup://) */
export function getAppReturnUri() {
  return AuthSession.makeRedirectUri({
    scheme: 'catchup',
    path: 'oauth',
  });
}

/** Expo Go 복귀 주소를 카카오 state에 안전하게 담기 (exp:// 직접 전달 시 KOE205 유발 가능) */
function encodeOAuthState(value) {
  try {
    const encoded = encodeURIComponent(value);
    if (typeof btoa === 'function') {
      return btoa(encoded).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
  } catch {
    // fall through
  }
  return value;
}

const PROVIDERS = {
  kakao: {
    clientId: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '',
    // scope는 동의항목 미설정 시 KOE205 유발 가능 → 기본 로그인만 요청
    scopes: [],
    discovery: {
      authorizationEndpoint: 'https://kauth.kakao.com/oauth/authorize',
      tokenEndpoint: 'https://kauth.kakao.com/oauth/token',
    },
  },
  naver: {
    clientId: process.env.EXPO_PUBLIC_NAVER_CLIENT_ID || '',
    scopes: [],
    discovery: {
      authorizationEndpoint: 'https://nid.naver.com/oauth2.0/authorize',
      tokenEndpoint: 'https://nid.naver.com/oauth2.0/token',
    },
  },
};

function usesRemoteApi() {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL?.trim() || '';
  return apiUrl.startsWith('https://');
}

function parseOAuthCallback(url, httpsRedirectUri) {
  let callback;
  try {
    callback = new URL(url);
  } catch {
    return null;
  }

  const error = callback.searchParams.get('error');
  const errorDescription = callback.searchParams.get('error_description');
  if (error) {
    throw new Error(errorDescription || `카카오 오류: ${error}`);
  }

  const code = callback.searchParams.get('code');
  if (!code) return null;

  const protocol = callback.protocol.replace(':', '');
  const isAppReturn = protocol === 'exp' || protocol === 'catchup';

  if (isAppReturn) {
    return { code, state: callback.searchParams.get('state') };
  }

  const expected = new URL(httpsRedirectUri);
  if (callback.origin !== expected.origin || callback.pathname !== expected.pathname) {
    return null;
  }

  return {
    code,
    state: callback.searchParams.get('state'),
  };
}

/** 백엔드가 state로 보관한 code를 폴링으로 가져온다 (안드로이드 딥링크 복귀 대체) */
async function pollKakaoCode(state, signal) {
  const apiBase = (process.env.EXPO_PUBLIC_API_URL || '').trim().replace(/\/$/, '');
  if (!apiBase.startsWith('https://') || !state) return null;

  const url = `${apiBase}/auth/kakao/result?state=${encodeURIComponent(state)}`;
  const deadline = Date.now() + 120000; // 최대 2분

  while (!signal.stopped && Date.now() < deadline) {
    try {
      const res = await fetch(url);
      if (res.status === 200) {
        const data = await res.json();
        if (data?.code) return { code: data.code, state: data.state ?? state };
      }
    } catch {
      // 네트워크 일시 오류는 무시하고 재시도
    }
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
}

export async function connectSocial(provider) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error('지원하지 않는 소셜 제공자입니다');

  const httpsRedirectUri =
    provider === 'kakao' ? getOAuthRedirectUri('kakao') : getOAuthRedirectUri('naver');
  const appReturnUri = getAppReturnUri();

  if (__DEV__) {
    console.log(`[OAuth:${provider}] https redirect →`, httpsRedirectUri);
    console.log(`[OAuth:${provider}] app return →`, appReturnUri);
  }

  if (!config.clientId) {
    if (usesRemoteApi()) {
      throw new Error(
        '카카오 키가 설정되지 않았습니다.\nfrontend/.env에 EXPO_PUBLIC_KAKAO_REST_API_KEY를 넣고 npm start -- --clear 로 재시작하세요.'
      );
    }
    return { provider, accessToken: DEV_MOCK_TOKEN };
  }

  const oauthState = encodeOAuthState(appReturnUri);

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri: httpsRedirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: config.scopes,
    usePKCE: false,
    state: oauthState,
  });

  const authUrl = await request.makeAuthUrlAsync(config.discovery);

  // 안드로이드 Expo Go는 exp:// 복귀를 못 잡으므로 백엔드가 code를 state로 보관하고
  // 앱이 폴링으로 가져온다. iOS/딥링크가 성공하면 폴링 결과를 기다리지 않고 바로 사용.
  const pollSignal = { stopped: false };
  const pollPromise = pollKakaoCode(oauthState, pollSignal).then((res) => {
    if (res) WebBrowser.dismissBrowser().catch(() => {}); // 폴링이 먼저 잡으면 브라우저 닫기
    return res;
  });

  let params = null;
  try {
    // 카카오 → https 콜백 → (iOS) exp:// 복귀 / (안드로이드) 폴링
    const browserResult = await WebBrowser.openAuthSessionAsync(authUrl, appReturnUri);
    if (browserResult.type === 'success' && browserResult.url) {
      params = parseOAuthCallback(browserResult.url, httpsRedirectUri);
    }
    if (__DEV__) {
      console.log(`[OAuth:${provider}] browser →`, browserResult.type, params?.code ? 'code✓' : 'no-code');
    }
    // 딥링크로 못 받았으면(안드로이드) 폴링 결과를 잠깐 더 대기
    if (!params?.code) {
      const polled = await Promise.race([
        pollPromise,
        new Promise((resolve) => setTimeout(() => resolve(null), 8000)),
      ]);
      if (polled?.code) params = polled;
    }
  } finally {
    pollSignal.stopped = true;
  }

  if (!params?.code) {
    throw new Error('카카오 로그인이 완료되지 않았습니다. 잠시 후 다시 시도해주세요.');
  }

  return {
    provider,
    code: params.code,
    state: params.state,
    redirectUri: httpsRedirectUri,
  };
}
