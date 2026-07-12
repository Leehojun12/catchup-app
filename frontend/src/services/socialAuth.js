import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const DEV_MOCK_TOKEN = 'dev-mock-token';

/**
 * 카카오 REST API Redirect URI는 http/https 만 허용합니다.
 * catchup://, exp:// 는 콘솔에 등록할 수 없습니다.
 */
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

const PROVIDERS = {
  kakao: {
    clientId: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '',
    scopes: ['profile_nickname'],
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

export function isKakaoOAuthConfigured() {
  return !!PROVIDERS.kakao.clientId;
}

export function isNaverOAuthConfigured() {
  return !!PROVIDERS.naver.clientId;
}

export async function connectSocial(provider) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error('지원하지 않는 소셜 제공자입니다');

  const redirectUri =
    provider === 'kakao' ? getOAuthRedirectUri('kakao') : getOAuthRedirectUri('naver');

  if (__DEV__) {
    console.log(`[OAuth:${provider}] redirectUri →`, redirectUri);
  }

  if (!config.clientId) {
    return { provider, accessToken: DEV_MOCK_TOKEN };
  }

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: config.scopes,
    usePKCE: false,
  });

  await request.makeAuthUrlAsync(config.discovery);
  const result = await request.promptAsync(config.discovery);

  if (result.type !== 'success' || !result.params?.code) {
    if (result.type === 'dismiss' || result.type === 'cancel') {
      throw new Error('소셜 로그인이 취소되었습니다');
    }
    throw new Error(
      '카카오 로그인에 실패했습니다. 카카오 콘솔 Redirect URI가 아래 주소와 정확히 일치하는지 확인해주세요.\n' +
        redirectUri
    );
  }

  return {
    provider,
    code: result.params.code,
    state: result.params.state,
    redirectUri,
  };
}
