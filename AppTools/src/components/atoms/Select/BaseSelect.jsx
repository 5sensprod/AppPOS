// src/components/atoms/Select/BaseSelect.jsx
import React from 'react';
import Select from 'react-select';

const baseStyles = {
  control: (provided, state) => ({
    ...provided,
    minHeight: '38px',
    borderColor: state.isFocused ? '#3B82F6' : '#D1D5DB',
    boxShadow: state.isFocused ? '0 0 0 1px #3B82F6' : 'none',
    '&:hover': {
      borderColor: '#9CA3AF',
    },
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '2px 8px',
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected ? '#3B82F6' : state.isFocused ? '#F3F4F6' : 'white',
    color: state.isSelected ? 'white' : '#374151',
    padding: '8px 12px',
    fontSize: '14px',
    ':active': {
      backgroundColor: '#3B82F6',
    },
  }),
  menuPortal: (base) => ({
    ...base,
    zIndex: 9999,
  }),
  menu: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
};

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
  const mergedStyles = {
    ...baseStyles,
    ...styles,
  };

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
