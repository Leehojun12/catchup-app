const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const smsAuthService = require('../services/smsAuth.service');
const kakaoAuthService = require('../services/kakaoAuth.service');
const naverAuthService = require('../services/naverAuth.service');
const { upsertUser, updateUser, getUser, publicUser, findBySocial } = require('../store/usersStore');

function buildKakaoUserData(profile, existing = null) {
  const data = {
    kakaoId: profile.id,
    nickname: profile.nickname,
    profileImageUrl: profile.profileImageUrl || null,
    kakaoLinked: true,
    kakaoAccessToken: profile.accessToken || null,
    provider: 'kakao',
  };

  if (!existing?.name?.trim()) {
    data.name = profile.nickname;
  }

  return data;
}
const { authMiddleware, requireAuth } = require('../middleware/auth');

const router = express.Router();

function issueToken(user) {
  return jwt.sign({ id: user.id }, config.jwtSecret, { expiresIn: '30d' });
}

// ---- Phone verification ----
router.post('/sms/send', async (req, res, next) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ message: '전화번호를 입력해주세요' });

    const result = await smsAuthService.sendCode(phone);
    res.json(result);
  } catch (error) {
    next(error);
  }
});

router.post('/sms/verify', async (req, res, next) => {
  try {
    const { phone, code } = req.body;
    if (!phone || !code) {
      return res.status(400).json({ message: '전화번호와 인증번호를 입력해주세요' });
    }

    const verified = smsAuthService.verifyCode(phone, code);
    if (!verified) {
      return res.status(401).json({ message: '인증번호가 올바르지 않습니다' });
    }

    res.json({ success: true, verified: true });
  } catch (error) {
    next(error);
  }
});

// ---- Signup (completes profile after phone verification) ----
router.post('/signup', async (req, res, next) => {
  try {
    const { phone, name, homeAddress, marketingConsent, social } = req.body;
    if (!phone) return res.status(400).json({ message: '휴대폰 인증이 필요합니다' });
    if (!name?.trim()) return res.status(400).json({ message: '이름을 입력해주세요' });

    const userData = {
      phone,
      name: name.trim(),
      homeAddress: homeAddress || null,
      marketingConsent: !!marketingConsent,
      provider: 'sms',
    };

    if (social?.provider === 'kakao') {
      const profile = await kakaoAuthService.resolveProfile(social);
      Object.assign(userData, buildKakaoUserData(profile, { name: userData.name }));
    }
    if (social?.provider === 'naver') {
      const profile = await naverAuthService.resolveProfile(social);
      userData.naverId = profile.id;
      userData.naverLinked = true;
      userData.naverAccessToken = profile.accessToken || null;
      if (!userData.phone && profile.mobile) userData.phone = profile.mobile;
    }

    const user = upsertUser(userData);
    res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

// ---- Social login / link ----
function decodeOAuthState(state) {
  if (typeof state !== 'string' || !state) return '';

  if (state.startsWith('exp://') || state.startsWith('catchup://')) {
    return state;
  }

  try {
    const padded = state.replace(/-/g, '+').replace(/_/g, '/');
    const padLen = (4 - (padded.length % 4)) % 4;
    const decoded = Buffer.from(padded + '='.repeat(padLen), 'base64').toString('utf8');
    return decodeURIComponent(decoded);
  } catch {
    return '';
  }
}

// OAuth callback → Expo Go로 복귀 (catchup-oauth-v2)
router.get('/kakao/callback', (req, res) => {
  const { code, state, error, error_description: errorDescription } = req.query;

  if (error) {
    res.status(400).setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`<!DOCTYPE html><html lang="ko"><body style="font-family:sans-serif;padding:32px;">
      <h2>카카오 로그인 오류</h2><p>${errorDescription || error}</p></body></html>`);
  }

  const returnTarget = decodeOAuthState(state);
  const isAppScheme =
    returnTarget.startsWith('exp://') || returnTarget.startsWith('catchup://');

  if (code && isAppScheme) {
    const separator = returnTarget.includes('?') ? '&' : '?';
    return res.redirect(
      302,
      `${returnTarget}${separator}code=${encodeURIComponent(String(code))}`
    );
  }

  const safeCode = JSON.stringify(code ? String(code) : '');
  const safeState = JSON.stringify(state ? String(state) : '');

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>CatchUp 로그인</title>
  <!-- catchup-oauth-v2 -->
  <style>
    body { font-family: -apple-system, sans-serif; text-align: center; padding: 48px 24px; }
    a { display: inline-block; margin-top: 16px; padding: 12px 20px; background: #14B8A6;
         color: #fff; text-decoration: none; border-radius: 10px; font-weight: 600; }
    p.note { color: #64748B; font-size: 14px; }
  </style>
</head>
<body>
  <p id="msg">앱으로 돌아가는 중...</p>
  <p class="note">자동 이동이 안 되면 아래 버튼을 눌러주세요.</p>
  <a id="openApp" href="#" style="display:none">CatchUp 앱으로 돌아가기</a>
  <script>
    function decodeState(raw) {
      if (!raw) return '';
      if (raw.indexOf('exp://') === 0 || raw.indexOf('catchup://') === 0) return raw;
      try {
        var b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
        while (b64.length % 4) b64 += '=';
        return decodeURIComponent(atob(b64));
      } catch (e) { return ''; }
    }
    var code = ${safeCode};
    var state = ${safeState};
    var target = decodeState(state);
    if (code && target) {
      var sep = target.indexOf('?') >= 0 ? '&' : '?';
      var appUrl = target + sep + 'code=' + encodeURIComponent(code);
      var link = document.getElementById('openApp');
      link.href = appUrl;
      link.style.display = 'inline-block';
      window.location.replace(appUrl);
    } else {
      document.getElementById('msg').textContent = '로그인 정보를 확인할 수 없습니다. 앱에서 다시 시도해주세요.';
    }
  </script>
</body>
</html>`);
});

// Accepts { code, redirectUri } (real OAuth) or { accessToken } (dev mock)
router.post('/kakao', async (req, res, next) => {
  try {
    const profile = await kakaoAuthService.resolveProfile(req.body);
    const existing = findBySocial('kakao', profile.id);
    const user = upsertUser(buildKakaoUserData(profile, existing));

    res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

// Accepts { code, state } (real OAuth) or { accessToken } (dev mock)
router.post('/naver', async (req, res, next) => {
  try {
    const profile = await naverAuthService.resolveProfile(req.body);
    const user = upsertUser({
      naverId: profile.id,
      nickname: profile.nickname,
      phone: profile.mobile || undefined,
      naverLinked: true,
      naverAccessToken: profile.accessToken || null,
      provider: 'naver',
    });

    res.json({ token: issueToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

// ---- Profile (requires auth) ----
router.get('/me', authMiddleware, requireAuth, (req, res) => {
  const user = getUser(req.user.id);
  if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
  res.json({ user: publicUser(user) });
});

router.patch('/me', authMiddleware, requireAuth, (req, res, next) => {
  try {
    const allowed = ['name', 'homeAddress', 'reminderEnabled', 'reminderChannel', 'marketingConsent'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    const user = updateUser(req.user.id, updates);
    if (!user) return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    res.json({ user: publicUser(user) });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
