const express = require('express');
const jwt = require('jsonwebtoken');
const config = require('../config/env');
const smsAuthService = require('../services/smsAuth.service');
const kakaoAuthService = require('../services/kakaoAuth.service');
const naverAuthService = require('../services/naverAuth.service');
const { upsertUser, updateUser, getUser, publicUser } = require('../store/usersStore');
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
      userData.kakaoId = profile.id;
      userData.kakaoLinked = true;
      userData.kakaoAccessToken = profile.accessToken || null;
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
// Accepts { code, redirectUri } (real OAuth) or { accessToken } (dev mock)
router.post('/kakao', async (req, res, next) => {
  try {
    const profile = await kakaoAuthService.resolveProfile(req.body);
    const user = upsertUser({
      kakaoId: profile.id,
      nickname: profile.nickname,
      kakaoLinked: true,
      kakaoAccessToken: profile.accessToken || null,
      provider: 'kakao',
    });

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
