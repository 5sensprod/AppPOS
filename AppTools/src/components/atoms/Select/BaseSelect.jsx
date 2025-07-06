// src/components/atoms/Select/BaseSelect.jsx
import React from 'react';
import Select from 'react-select';
import { createSelectStyles } from './selectStyles';

const BaseSelect = ({
  options = [],
  value,
  onChange,
  placeholder = 'Sélectionner...',
  isMulti = false,
  isClearable = true,
  isDisabled = false,
  isSearchable = true,
  className = '',
  styles = {},
  ...props
}) => {
  // ✅ Utiliser les styles partagés comme base
  const mergedStyles = createSelectStyles(styles);

  return (
    <Select
      options={options}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      isMulti={isMulti}
      isClearable={isClearable}
      isDisabled={isDisabled}
      isSearchable={isSearchable}
      className={`react-select-container ${className}`}
      classNamePrefix="react-select"
      menuPlacement="auto"
      menuPortalTarget={document.body}
      styles={mergedStyles}
      {...props}
    />
  );
};

export default BaseSelect;
