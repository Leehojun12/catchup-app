module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'catchup-dev-secret',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  youtubeApiKey: process.env.YOUTUBE_API_KEY || '',

  // Kakao
  kakaoRestApiKey: process.env.KAKAO_REST_API_KEY || '',
  kakaoClientSecret: process.env.KAKAO_CLIENT_SECRET || '',

  // Naver
  naverClientId: process.env.NAVER_CLIENT_ID || '',
  naverClientSecret: process.env.NAVER_CLIENT_SECRET || '',

  // SMS / messaging
  smsProvider: process.env.SMS_PROVIDER || 'mock',
  smsSenderNumber: process.env.SMS_SENDER_NUMBER || '',

  // Reminder scheduler tick (ms)
  reminderTickMs: Number(process.env.REMINDER_TICK_MS || 60000),
};
