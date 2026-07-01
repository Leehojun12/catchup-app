import { Alert, Linking } from 'react-native';

function enc(value) {
  return encodeURIComponent(value || '');
}

// origin / destination: { name, address, lat, lng }
// Tries native Kakao Map / Naver Map apps first (when coordinates exist),
// then falls back to web links that work with address/name strings.
export async function openDirections({ origin, destination }) {
  if (!destination || (!destination.address && !destination.name)) {
    Alert.alert('길찾기', '도착지 정보가 없습니다.');
    return;
  }
  if (!origin || (!origin.address && !origin.name && !origin.lat)) {
    Alert.alert('길찾기', '집 주소가 등록되어 있지 않습니다.\n내 정보에서 집 주소를 먼저 등록해주세요.');
    return;
  }

  const candidates = [];

  if (origin.lat && origin.lng && destination.lat && destination.lng) {
    candidates.push(
      `kakaomap://route?sp=${origin.lat},${origin.lng}&ep=${destination.lat},${destination.lng}&by=CAR`
    );
    candidates.push(
      `nmap://route/car?slat=${origin.lat}&slng=${origin.lng}&sname=${enc(origin.name)}` +
        `&dlat=${destination.lat}&dlng=${destination.lng}&dname=${enc(destination.name)}&appname=com.catchup.app`
    );
  }

  const originText = origin.address || origin.name;
  const destText = destination.address || destination.name;

  candidates.push(`https://map.kakao.com/?sName=${enc(originText)}&eName=${enc(destText)}`);
  candidates.push(
    `https://www.google.com/maps/dir/?api=1&origin=${enc(originText)}&destination=${enc(destText)}`
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

  // Guaranteed web fallback
  await Linking.openURL(candidates[candidates.length - 1]);
}
