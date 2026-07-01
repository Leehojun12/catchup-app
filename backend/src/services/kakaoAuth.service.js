const config = require('../config/env');

function mockProfile() {
  return {
    id: `mock_kakao_${Date.now()}`,
    nickname: 'CatchUp 카카오 사용자',
    accessToken: null,
  };
}

// Fetch the Kakao profile from an existing access token.
async function getProfile(accessToken) {
  if (!config.kakaoRestApiKey) return mockProfile();

  const response = await fetch('https://kapi.kakao.com/v2/user/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('카카오 인증에 실패했습니다');

  const data = await response.json();
  return {
    id: String(data.id),
    nickname: data.kakao_account?.profile?.nickname || '사용자',
    accessToken,
  };
}

// Exchange an authorization code for an access token, then fetch the profile.
async function getProfileFromCode(code, redirectUri) {
  if (!config.kakaoRestApiKey) return mockProfile();

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.kakaoRestApiKey,
    redirect_uri: redirectUri,
    code,
  });
  if (config.kakaoClientSecret) body.set('client_secret', config.kakaoClientSecret);

  const tokenRes = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
    body,
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => '');
    throw new Error(`카카오 토큰 교환 실패: ${detail}`);
  }

  const { access_token } = await tokenRes.json();
  return getProfile(access_token);
}

// Resolves a profile from whichever payload the client sent.
async function resolveProfile({ code, redirectUri, accessToken }) {
  if (code) return getProfileFromCode(code, redirectUri);
  if (accessToken) return getProfile(accessToken);
  throw new Error('카카오 인증 정보가 없습니다');
}

module.exports = { getProfile, getProfileFromCode, resolveProfile };
