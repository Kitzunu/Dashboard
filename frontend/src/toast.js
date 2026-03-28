export function toast(text, type = 'success') {
  window.dispatchEvent(new CustomEvent('toast', { detail: { text, type } }));
}
