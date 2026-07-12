export function getDisplayName(user) {
  if (!user) return 'CatchUp 사용자';
  if (user.kakaoLinked && user.nickname) return user.nickname;
  return user.name || user.nickname || 'CatchUp 사용자';
}

export function getProfileImageUrl(user) {
  if (user?.kakaoLinked && user.profileImageUrl) return user.profileImageUrl;
  return null;
}

export function getProfileSubtitle(user) {
  if (user?.phone) return user.phone;
  if (user?.kakaoLinked) return '카카오 연동 계정';
  if (user?.naverLinked) return '네이버 연동 계정';
  return '휴대폰 미등록';
}

export function getAvatarInitial(user) {
  const name = getDisplayName(user);
  return (name[0] || 'C').toUpperCase();
}
