// src/components/atoms/Input/NumberInput.jsx
import React from 'react';
import InputField from './InputField';

const NumberInput = ({
  min = 0,
  max,
  step = 1,
  allowDecimals = false,
  allowNegative = false,
  currency = false,
  currencySymbol = '€',
  percentage = false,
  validationRules = {},
  ...props
}) => {
  // Ajuster les props selon les options
  const adjustedMin = allowNegative ? undefined : min;
  const adjustedStep = allowDecimals ? 0.01 : step;

  // Règles de validation personnalisées
  const numberValidationRules = {
    ...validationRules,
    min:
      adjustedMin !== undefined
        ? {
            value: adjustedMin,
            message: `La valeur doit être supérieure ou égale à ${adjustedMin}`,
          }
        : undefined,
    max:
      max !== undefined
        ? {
            value: max,
            message: `La valeur doit être inférieure ou égale à ${max}`,
          }
        : undefined,
  };

  // Formater la valeur en mode lecture
  const formatValue = (value) => {
    if (value === undefined || value === null || value === '') return 'Non défini';

    const numValue = Number(value);
    if (isNaN(numValue)) return 'Valeur invalide';

    let formatted = allowDecimals ? numValue.toFixed(2) : numValue.toString();

    if (currency) {
      formatted = `${formatted} ${currencySymbol}`;
    } else if (percentage) {
      formatted = `${formatted}%`;
    }

    return formatted;
  };

  return (
    <InputField
      type="number"
      min={adjustedMin}
      max={max}
      step={adjustedStep}
      validationRules={numberValidationRules}
      // Override du formatage en mode lecture
      value={
        props.editable === false && props.value !== undefined
          ? formatValue(props.value)
          : props.value
      }
      {...props}
    />
  );
};

export default NumberInput;
