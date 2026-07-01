// RN 0.81 defines Event.NONE as read-only, which breaks fetch/abort-controller
// (event-target-shim). Patch defineProperty before react-native loads.
const PHASES = new Set(['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE']);
const originalDefineProperty = Object.defineProperty;

Object.defineProperty = function definePropertyWithWritablePhases(obj, prop, descriptor) {
  if (
    PHASES.has(prop) &&
    descriptor != null &&
    typeof descriptor === 'object' &&
    ('value' in descriptor || 'get' in descriptor)
  ) {
    descriptor = {
      ...descriptor,
      writable: descriptor.writable ?? true,
      configurable: descriptor.configurable ?? true,
    };
  }
  return originalDefineProperty.call(Object, obj, prop, descriptor);
};
