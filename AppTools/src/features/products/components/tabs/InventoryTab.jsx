import React from 'react';
import StockSection from '../sections/StockSection';
import BarcodeSection from '../sections/BarcodeSection';
import CategoriesSection from '../sections/CategoriesSection';

const InventoryTab = ({
  product,
  editable = false,
  register,
  control,
  errors,
  setValue, // ✅ AJOUTÉ
  watch, // ✅ AJOUTÉ
  specialFields = {},
  hierarchicalCategories = [],
}) => {
  return (
    <div className="space-y-8">
      <StockSection product={product} editable={editable} register={register} errors={errors} />

      <BarcodeSection
        product={product}
        editable={editable}
        register={register}
        control={control} // ✅ AJOUTÉ au cas où
        errors={errors}
        setValue={setValue} // ✅ AJOUTÉ
        watch={watch} // ✅ AJOUTÉ
      />

      <CategoriesSection
        product={product}
        editable={editable}
        register={register}
        control={control}
        errors={errors}
        specialFields={specialFields}
        hierarchicalCategories={hierarchicalCategories}
      />
    </div>
  );
};

export default InventoryTab;
