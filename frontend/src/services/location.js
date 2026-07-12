import * as Location from 'expo-location';

export async function getCurrentLocation() {
  const { status } = await Location.requestForegroundPermissionsAsync();
  if (status !== 'granted') {
    throw new Error('위치 권한이 필요합니다.\n설정에서 CatchUp의 위치 접근을 허용해주세요.');
  }

  const position = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.Balanced,
  });

  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    name: '현재 위치',
    address: '현재 위치',
  };
}
