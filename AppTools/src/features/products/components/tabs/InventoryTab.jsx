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
  setValue,
  watch,
  specialFields = {},
  // ✅ SUPPRIMER hierarchicalCategories - le hook useCategoryUtils gère cela
  // hierarchicalCategories = [], // ❌ RETIRÉ
  categoryUtils, // ✅ NOUVEAU : pour usage avancé si nécessaire
}) => {
  return (
    <div className="space-y-8">
      <StockSection product={product} editable={editable} register={register} errors={errors} />

      <BarcodeSection
        product={product}
        editable={editable}
        register={register}
        control={control}
        errors={errors}
        setValue={setValue}
        watch={watch}
      />

      <CategoriesSection
        product={product}
        editable={editable}
        register={register}
        control={control}
        errors={errors}
        specialFields={specialFields}
        // ✅ SUPPRIMER hierarchicalCategories - CategoriesSection utilise maintenant useCategoryUtils
        // hierarchicalCategories={hierarchicalCategories} // ❌ RETIRÉ
        categoryUtils={categoryUtils} // ✅ PASSER pour usage avancé si nécessaire
      />
    </div>
  );
};

export default InventoryTab;
