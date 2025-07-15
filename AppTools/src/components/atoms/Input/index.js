// src/components/atoms/Input/index.js

// Composants principaux
export { default as BaseInput } from './BaseInput';
export { default as InputField } from './InputField';
export { default as NumberInput } from './NumberInput';
export { default as TextInput } from './TextInput';
export { default as TextareaInput } from './TextareaInput';
export { default as SelectField } from './SelectField';
export { default as BarcodeInput } from './BarcodeInput';

// Utilitaires de style
export {
  getInputClassName,
  getLabelClassName,
  getMessageClassName,
  getReadOnlyClassName,
  getRegisterOptions,
  baseInputStyles,
  inputTypes,
} from './inputStyles';
