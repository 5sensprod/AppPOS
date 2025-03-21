// src/utils/entityUtils.js
export function pluralize(word) {
  if (!word) return '';
  return word.endsWith('s') ? word : `${word}s`;
}
