import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const DEV_MOCK_TOKEN = 'dev-mock-token';

const PROVIDERS = {
  kakao: {
    clientId: process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY || '',
    scopes: ['profile_nickname', 'talk_message'],
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

const redirectUri = AuthSession.makeRedirectUri({ scheme: 'catchup' });

// Returns one of:
//   { provider, code, redirectUri }   ← real OAuth (backend exchanges code → token)
//   { provider, accessToken }         ← dev mock (no keys configured)
export async function connectSocial(provider) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error('지원하지 않는 소셜 제공자입니다');

  // No client id yet → fall back to dev mock so the flow still works end-to-end.
  if (!config.clientId) {
    return { provider, accessToken: DEV_MOCK_TOKEN };
  }

  const request = new AuthSession.AuthRequest({
    clientId: config.clientId,
    redirectUri,
    responseType: AuthSession.ResponseType.Code,
    scopes: config.scopes,
    usePKCE: false, // token exchange happens server-side with the client secret
  });

  await request.makeAuthUrlAsync(config.discovery);
  const result = await request.promptAsync(config.discovery);

  if (result.type !== 'success' || !result.params?.code) {
    throw new Error('소셜 로그인이 취소되었습니다');
  }

  return {
    provider,
    code: result.params.code,
    state: result.params.state, // required by Naver token exchange
    redirectUri,
  };
}
