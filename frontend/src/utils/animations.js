export function pulse(element) {
  if (!element) return;
  element.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.04)' }, { transform: 'scale(1)' }], { duration: 280 });
}
