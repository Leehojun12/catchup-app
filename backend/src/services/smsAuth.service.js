const config = require('../config/env');

const codes = new Map();

function generateCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Low-level send. Replace mock with CoolSMS / Twilio / NHN Cloud in production.
async function sendSms(phone, message) {
  if (config.smsProvider === 'mock') {
    console.log(`[SMS Mock] → ${phone}\n${message}`);
    return { success: true, provider: 'mock' };
  }

  // TODO: integrate real provider using config.smsProvider / config.smsSenderNumber
  console.log(`[SMS:${config.smsProvider}] → ${phone}: ${message}`);
  return { success: true, provider: config.smsProvider };
}

async function sendCode(phone) {
  const code = generateCode();
  codes.set(phone, { code, expiresAt: Date.now() + 3 * 60 * 1000 });

  await sendSms(phone, `[CatchUp] 인증번호 [${code}] 를 입력해주세요.`);

  return {
    success: true,
    message: '인증번호가 발송되었습니다',
    ...(process.env.NODE_ENV !== 'production' && { debugCode: code }),
  };
}

function verifyCode(phone, code) {
  const stored = codes.get(phone);
  if (!stored) return false;
  if (Date.now() > stored.expiresAt) {
    codes.delete(phone);
    return false;
  }
  if (stored.code !== code) return false;
  codes.delete(phone);
  return true;
}

module.exports = { sendCode, verifyCode, sendSms };
