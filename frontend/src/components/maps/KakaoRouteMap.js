import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import { colors } from '../../constants/theme';

const MODE_COLORS = {
  car: '#14B8A6',
  walk: '#2563EB',
  transit: '#7C3AED',
};

function buildMapHtml(apiKey) {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <style>
    html, body { margin:0; padding:0; width:100%; height:100%; background:#E2E8F0; overflow:hidden; }
    #map { width:100%; height:100%; }
    .badge {
      padding:5px 10px; border-radius:999px; font-size:11px; font-weight:700; color:#fff;
      box-shadow:0 2px 8px rgba(0,0,0,.15); white-space:nowrap;
    }
    .badge-start { background:#14B8A6; }
    .badge-end { background:#EF4444; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${apiKey}&autoload=false"></script>
  <script>
    var map, polyline, markers = [], overlays = [];

    function clearMap() {
      if (polyline) { polyline.setMap(null); polyline = null; }
      markers.forEach(function(m) { m.setMap(null); });
      markers = [];
      overlays.forEach(function(o) { o.setMap(null); });
      overlays = [];
    }

    window.renderRoute = function(payload) {
      if (!payload || !payload.origin || !payload.destination) return;
      if (!window.kakao || !window.kakao.maps) {
        if (window.ReactNativeWebView) {
          window.ReactNativeWebView.postMessage('MAP_SDK_FAIL');
        }
        return;
      }
      kakao.maps.load(function() {
        var startPos = new kakao.maps.LatLng(payload.origin.lat, payload.origin.lng);
        var endPos = new kakao.maps.LatLng(payload.destination.lat, payload.destination.lng);

        if (!map) {
          map = new kakao.maps.Map(document.getElementById('map'), {
            center: startPos,
            level: 5,
          });
        }
        clearMap();

        var color = payload.color || '#14B8A6';
        var pathCoords = (payload.path || []).map(function(p) {
          return new kakao.maps.LatLng(p.lat, p.lng);
        });

        if (pathCoords.length > 1) {
          polyline = new kakao.maps.Polyline({
            path: pathCoords,
            strokeWeight: 6,
            strokeColor: color,
            strokeOpacity: 0.9,
          });
          polyline.setMap(map);
        } else {
          pathCoords = [startPos, endPos];
        }

        markers.push(new kakao.maps.Marker({ position: startPos, map: map }));
        markers.push(new kakao.maps.Marker({ position: endPos, map: map }));

        var startOverlay = new kakao.maps.CustomOverlay({
          position: startPos,
          content: '<div class="badge badge-start">출발</div>',
          yAnchor: 2.4,
        });
        var endOverlay = new kakao.maps.CustomOverlay({
          position: endPos,
          content: '<div class="badge badge-end">도착</div>',
          yAnchor: 2.4,
        });
        startOverlay.setMap(map);
        endOverlay.setMap(map);
        overlays.push(startOverlay, endOverlay);

        var bounds = new kakao.maps.LatLngBounds();
        pathCoords.forEach(function(p) { bounds.extend(p); });
        map.setBounds(bounds, 64, 64, 220, 64);
        setTimeout(function() { map.relayout(); }, 120);
      });
    };
  </script>
</body>
</html>`;
}

function buildPayload(origin, destination, path, mode) {
  if (!origin || !destination) return null;
  return {
    origin,
    destination,
    path: path?.length > 1 ? path : [
      { lat: origin.lat, lng: origin.lng },
      { lat: destination.lat, lng: destination.lng },
    ],
    mode,
    color: MODE_COLORS[mode] || MODE_COLORS.car,
  };
}

export default function KakaoRouteMap({ origin, destination, path, mode, loading }) {
  const webRef = useRef(null);
  const [mapError, setMapError] = useState('');
  const jsKey = process.env.EXPO_PUBLIC_KAKAO_JS_KEY?.trim() || '';
  const restKey = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY?.trim() || '';
  const apiKey = jsKey || process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY?.trim() || '';
  const html = useMemo(() => buildMapHtml(apiKey), [apiKey]);
  const mapBaseUrl = 'http://localhost';
  const payload = useMemo(
    () => buildPayload(origin, destination, path, mode),
    [origin, destination, path, mode]
  );

  const injectRoute = () => {
    if (!webRef.current || !payload) return;
    webRef.current.injectJavaScript(`window.renderRoute(${JSON.stringify(payload)}); true;`);
  };

  useEffect(() => {
    injectRoute();
  }, [payload]);

  if (!apiKey) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.fallbackTitle}>JavaScript 키가 없어요</Text>
        <Text style={styles.fallbackText}>
          frontend/.env에 아래 한 줄 추가 후{'\n'}
          npm start -- --clear 로 재시작하세요.{'\n\n'}
          EXPO_PUBLIC_KAKAO_JS_KEY=콘솔의_JavaScript_키
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: mapBaseUrl }}
        style={styles.webview}
        javaScriptEnabled
        domStorageEnabled
        setBuiltInZoomEnabled={false}
        androidLayerType="hardware"
        onLoadEnd={injectRoute}
        onMessage={(event) => {
          const msg = event.nativeEvent.data;
          if (msg === 'MAP_SDK_FAIL') {
            setMapError(
              '지도 SDK 로드 실패\n' +
                '① .env에 EXPO_PUBLIC_KAKAO_JS_KEY (JavaScript 키)\n' +
                '② JS SDK 도메인에 http://localhost 등록\n' +
                '③ npm start -- --clear 재시작'
            );
          }
        }}
        onHttpError={() => {
          setMapError('카카오 지도 스크립트를 불러오지 못했습니다.');
        }}
      />
      {mapError ? (
        <View style={styles.mapError}>
          <Text style={styles.mapErrorText}>{mapError}</Text>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  webview: {
    flex: 1,
    backgroundColor: '#E2E8F0',
  },
  loading: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.35)',
  },
  mapError: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '40%',
    backgroundColor: 'rgba(255,255,255,0.94)',
    borderRadius: 12,
    padding: 14,
  },
  mapErrorText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
  },
  fallback: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    padding: 24,
  },
  fallbackTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  fallbackText: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
