// src/utils/entityUtils.js
export function pluralize(word) {
  if (!word) return '';
  return word.endsWith('s') ? word : `${word}s`;
}

export function capitalize(string) {
  if (!string) return '';
  return string.charAt(0).toUpperCase() + string.slice(1);
}
