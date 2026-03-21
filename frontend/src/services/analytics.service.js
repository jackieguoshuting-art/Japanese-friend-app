export function trackEvent(name, payload = {}) {
  console.info('[analytics]', name, payload);
}
