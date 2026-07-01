// Must be imported before any WatermelonDB import.
// Hermes' performance.now lacks a bindable form that WatermelonDB expects.
if (typeof global !== 'undefined' && global.performance) {
  const originalNow = global.performance.now;
  if (typeof originalNow === 'function' && typeof originalNow.bind !== 'function') {
    global.performance.now = () => originalNow.call(global.performance);
  }
}
