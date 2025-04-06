// src/components/common/EntityTable/components/UnifiedFilterBar.jsx
import React from 'react';
import Select from 'react-select';

const UnifiedFilterBar = ({ filterOptions = [], selectedFilters = [], onChange }) => {
  return (
    <div className="w-full max-w-xl">
      <Select
        isMulti
        options={filterOptions}
        value={selectedFilters}
        onChange={onChange}
        placeholder="Filtrer par fournisseur, synchronisation..."
        className="react-select-container"
        classNamePrefix="react-select"
        closeMenuOnSelect={false}
      />
    </div>
  );
};

export default UnifiedFilterBar;
