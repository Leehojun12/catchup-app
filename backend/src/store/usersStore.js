const users = new Map();

function createId() {
  return `user_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

function findByPhone(phone) {
  if (!phone) return null;
  return [...users.values()].find((user) => user.phone === phone) || null;
}

function findBySocial(provider, socialId) {
  if (!socialId) return null;
  const key = provider === 'kakao' ? 'kakaoId' : 'naverId';
  return [...users.values()].find((user) => user[key] === socialId) || null;
}

function upsertUser(data) {
  const existing =
    findByPhone(data.phone) ||
    findBySocial('kakao', data.kakaoId) ||
    findBySocial('naver', data.naverId);

  if (existing) {
    const updated = { ...existing, ...data, updatedAt: new Date().toISOString() };
    users.set(existing.id, updated);
    return updated;
  }

  const user = {
    id: createId(),
    createdAt: new Date().toISOString(),
    // default fields
    name: '',
    phone: '',
    homeAddress: null, // { roadAddress, jibunAddress, zonecode, lat, lng }
    kakaoId: null,
    naverId: null,
    kakaoLinked: false,
    naverLinked: false,
    reminderEnabled: true,
    reminderChannel: 'sms', // 'sms' | 'kakao'
    marketingConsent: false,
    ...data,
  };
  users.set(user.id, user);
  return user;
}

function updateUser(id, updates) {
  const existing = users.get(id);
  if (!existing) return null;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  users.set(id, updated);
  return updated;
}

function getUser(id) {
  return users.get(id) || null;
}

function getAllUsers() {
  return [...users.values()];
}

// Strip sensitive fields before returning to the client
function publicUser(user) {
  if (!user) return null;
  const { kakaoAccessToken, naverAccessToken, ...safe } = user;
  return safe;
}

module.exports = {
  upsertUser,
  updateUser,
  getUser,
  getAllUsers,
  findByPhone,
  findBySocial,
  publicUser,
};
