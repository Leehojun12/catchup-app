const config = require('../config/env');

function mockProfile() {
  return {
    id: `mock_naver_${Date.now()}`,
    nickname: 'CatchUp 네이버 사용자',
    email: null,
    mobile: null,
    accessToken: null,
  };
}

// Fetch the Naver profile from an existing access token.
async function getProfile(accessToken) {
  if (!config.naverClientId) return mockProfile();

  const response = await fetch('https://openapi.naver.com/v1/nid/me', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) throw new Error('네이버 인증에 실패했습니다');

  const data = await response.json();
  const profile = data.response || {};
  return {
    id: String(profile.id),
    nickname: profile.nickname || profile.name || '사용자',
    email: profile.email || null,
    mobile: profile.mobile ? profile.mobile.replace(/-/g, '') : null,
    accessToken,
  };
}

// Exchange an authorization code (+ state) for an access token, then fetch profile.
async function getProfileFromCode(code, state) {
  if (!config.naverClientId) return mockProfile();

  const params = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: config.naverClientId,
    client_secret: config.naverClientSecret,
    code,
    state: state || '',
  });

  const tokenRes = await fetch(`https://nid.naver.com/oauth2.0/token?${params}`, {
    method: 'POST',
  });
  if (!tokenRes.ok) {
    const detail = await tokenRes.text().catch(() => '');
    throw new Error(`네이버 토큰 교환 실패: ${detail}`);
  }

  const { access_token } = await tokenRes.json();
  return getProfile(access_token);
}

async function resolveProfile({ code, state, accessToken }) {
  if (code) return getProfileFromCode(code, state);
  if (accessToken) return getProfile(accessToken);
  throw new Error('네이버 인증 정보가 없습니다');
}

module.exports = { getProfile, getProfileFromCode, resolveProfile };
