import { Linking } from 'react-native';
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

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri: httpsRedirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: config.scopes,
    usePKCE: false,
    state: encodeOAuthState(appReturnUri),
  });

  const authUrl = await request.makeAuthUrlAsync(config.discovery);

  // Android Custom Tabs는 exp:// 복귀를 세션 결과로 못 잡고 dismiss를 반환하므로
  // Linking 이벤트로 딥링크를 병행 수신 (Expo WebBrowser 문서 권장 패턴)
  let resolveDeepLink;
  const deepLink = new Promise((resolve) => {
    resolveDeepLink = resolve;
  });
  const subscription = Linking.addEventListener('url', ({ url }) => {
    resolveDeepLink(url);
    WebBrowser.dismissBrowser().catch(() => {});
  });

  let browserResult;
  let resultUrl = null;
  try {
    // 카카오 → https 콜백 → exp:// 로 복귀 (Render 콜백 페이지가 처리)
    browserResult = await WebBrowser.openAuthSessionAsync(authUrl, appReturnUri);

    if (browserResult.type === 'success' && browserResult.url) {
      resultUrl = browserResult.url;
    } else if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
      // dismiss 직후 딥링크가 늦게 도착할 수 있어 잠깐 대기
      resultUrl = await Promise.race([
        deepLink,
        new Promise((resolve) => setTimeout(() => resolve(null), 1500)),
      ]);
    }
  } finally {
    subscription.remove();
  }

  if (__DEV__) {
    console.log(`[OAuth:${provider}] browser →`, browserResult.type, resultUrl);
  }

  if (!resultUrl) {
    if (browserResult.type === 'cancel' || browserResult.type === 'dismiss') {
      throw new Error(
        '카카오 로그인이 완료되지 않았습니다.\n' +
          '로그인 후 브라우저가 자동으로 닫혀야 합니다. 상단 취소를 누르지 마세요.'
      );
    }
    throw new Error('카카오 로그인에 실패했습니다. Redirect URI 설정을 확인해주세요.');
  }

  const params = parseOAuthCallback(resultUrl, httpsRedirectUri);
  if (!params?.code) {
    throw new Error('카카오 인증 코드를 받지 못했습니다.');
  }

  return {
    provider,
    code: params.code,
    state: params.state,
    redirectUri: httpsRedirectUri,
  };
}
