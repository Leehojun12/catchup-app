import { Alert, Linking } from 'react-native';

function enc(value) {
  return encodeURIComponent(value || '');
}

const KAKAO_BY = {
  car: 'CAR',
  walk: 'FOOT',
  transit: 'PUBLICTRANSIT',
};

const NAVER_MODE = {
  car: 'car',
  walk: 'walk',
  transit: 'public',
};

// origin / destination: { name, address, lat, lng }
// mode: 'car' | 'walk' | 'transit'
export async function openDirections({ origin, destination, mode = 'car' }) {
  if (!destination || (!destination.address && !destination.name)) {
    Alert.alert('길찾기', '도착지 정보가 없습니다.');
    return;
  }
  if (!origin || (!origin.address && !origin.name && !origin.lat)) {
    Alert.alert('길찾기', '현재 위치를 가져올 수 없습니다.\n위치 권한을 확인해주세요.');
    return;
  }

  const kakaoBy = KAKAO_BY[mode] || KAKAO_BY.car;
  const naverMode = NAVER_MODE[mode] || NAVER_MODE.car;
  const candidates = [];

  if (origin.lat && origin.lng && destination.lat && destination.lng) {
    candidates.push(
      `kakaomap://route?sp=${origin.lat},${origin.lng}&ep=${destination.lat},${destination.lng}&by=${kakaoBy}`
    );
    candidates.push(
      `nmap://route/${naverMode}?slat=${origin.lat}&slng=${origin.lng}&sname=${enc(origin.name)}` +
        `&dlat=${destination.lat}&dlng=${destination.lng}&dname=${enc(destination.name)}&appname=com.catchup.app`
    );
  }

  const originText = origin.address || origin.name;
  const destText = destination.address || destination.name;

  candidates.push(`https://map.kakao.com/?sName=${enc(originText)}&eName=${enc(destText)}`);
  candidates.push(
    `https://www.google.com/maps/dir/?api=1&origin=${enc(originText)}&destination=${enc(destText)}&travelmode=${
      mode === 'walk' ? 'walking' : mode === 'transit' ? 'transit' : 'driving'
    }`
  );

  for (const url of candidates) {
    try {
      const supported = await Linking.canOpenURL(url);
      if (supported) {
        await Linking.openURL(url);
        return;
      }
    } catch {
      // try next candidate
    }
  }

  await Linking.openURL(candidates[candidates.length - 1]);
}
