import React, { useMemo, useEffect, useState } from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import MultiHierarchicalSelector from '../../../../components/common/MultiHierarchicalSelector';
import BarcodeSelector from '../../../../components/common/BarcodeSelector';
import { QRCodeSVG } from 'qrcode.react';

// Séparation en composants plus petits pour une meilleure organisation
const StockSection = ({ product, editable, register, errors }) => {
  if (!editable) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Gestion des stocks
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock actuel</h3>
            <p
              className={`mt-1 font-medium ${
                product.stock <= product.min_stock
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-gray-900 dark:text-gray-100'
              }`}
            >
              {product.stock !== undefined ? product.stock : '-'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Stock minimum</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.min_stock !== undefined ? product.min_stock : 'Non défini'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Gestion de stock
            </h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.manage_stock ? 'Activée' : 'Désactivée'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Gestion des stocks
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stock actuel
          </label>
          <input
            type="number"
            {...register('stock')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors?.stock && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.stock.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Stock minimum
          </label>
          <input
            type="number"
            {...register('min_stock')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
          {errors?.min_stock && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {errors.min_stock.message}
            </p>
          )}
        </div>

        <div className="flex items-center">
          <label className="inline-flex items-center mt-3">
            <input
              type="checkbox"
              {...register('manage_stock')}
              className="form-checkbox h-5 w-5 text-blue-600"
            />
            <span className="ml-2 text-gray-700 dark:text-gray-300">
              Activer la gestion de stock
            </span>
          </label>
        </div>
      </div>
    </div>
  );
};

// Nouveau composant pour le code-barres
const BarcodeSection = ({ product, editable, register, control, errors }) => {
  // Extraction du code-barres des métadonnées
  const getBarcodeValue = () => {
    if (!product?.meta_data) return null;
    const barcodeData = product.meta_data.find((item) => item.key === 'barcode');
    return barcodeData ? barcodeData.value : null;
  };

  const barcodeValue = getBarcodeValue();
  const [localBarcode, setLocalBarcode] = useState(barcodeValue || '');
  const [showBarcodes, setShowBarcodes] = useState(false);

  // Mise à jour du state local quand les props changent
  useEffect(() => {
    setLocalBarcode(barcodeValue || '');
  }, [barcodeValue]);

  if (!editable) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Codes d'identification
        </h2>

        <div className="mb-4">
          <div className="flex items-center">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Code-barres</h3>
            <span className="ml-2 text-gray-900 dark:text-gray-100">
              {barcodeValue || 'Non défini'}
            </span>
            {barcodeValue && (
              <button
                onClick={() => setShowBarcodes(!showBarcodes)}
                className="ml-3 text-xs bg-gray-50 text-blue-500 hover:text-blue-700 px-2 py-1 rounded"
              >
                {showBarcodes ? 'Masquer' : 'Afficher'}
              </button>
            )}
          </div>

          {barcodeValue && showBarcodes && (
            <div className="mt-4 flex flex-col md:flex-row md:space-x-8">
              <div className="border p-4 rounded-lg bg-white flex flex-col items-center mb-4 md:mb-0">
                <div className="text-sm text-gray-500 mb-2">Format: EAN13</div>
                <BarcodeSelector
                  value={barcodeValue}
                  readOnly={true}
                  showBoth={false}
                  hideImprint={true}
                />
              </div>

              <div className="border p-4 rounded-lg bg-white flex flex-col items-center">
                <div className="text-sm text-gray-500 mb-2">QR Code</div>
                <QRCodeSVG value={barcodeValue} size={128} level="M" />
                <div className="flex space-x-2 mt-3">
                  <a
                    href={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(
                      `<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">
                      <foreignObject width="128" height="128">
                        <div xmlns="http://www.w3.org/1999/xhtml">
                          ${document.querySelector('svg')?.outerHTML || ''}
                        </div>
                      </foreignObject>
                    </svg>`
                    )}`}
                    download={`qrcode-${barcodeValue}.svg`}
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                  >
                    SVG
                  </a>
                  <button
                    className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                    onClick={() => {
                      // Créer un PNG à partir du SVG
                      const svg = document.querySelector('svg');
                      if (svg) {
                        const svgData = new XMLSerializer().serializeToString(svg);
                        const canvas = document.createElement('canvas');
                        canvas.width = 128;
                        canvas.height = 128;
                        const ctx = canvas.getContext('2d');
                        const img = new Image();
                        img.onload = () => {
                          ctx.drawImage(img, 0, 0);
                          const pngUrl = canvas.toDataURL('image/png');
                          const downloadLink = document.createElement('a');
                          downloadLink.href = pngUrl;
                          downloadLink.download = `qrcode-${barcodeValue}.png`;
                          downloadLink.click();
                        };
                        img.src =
                          'data:image/svg+xml;base64,' +
                          btoa(unescape(encodeURIComponent(svgData)));
                      }
                    }}
                  >
                    PNG
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Codes d'identification
      </h2>

      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Code-barres
            </label>
            <input
              type="text"
              {...register('meta_data.barcode')}
              defaultValue={barcodeValue}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder="Ex: 3760010255333"
              onChange={(e) => setLocalBarcode(e.target.value)}
            />
            {errors?.meta_data?.barcode && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                {errors.meta_data.barcode.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              Entrez le code-barres (EAN-13 recommandé)
            </p>
          </div>
        </div>

        {/* Prévisualisation en temps réel */}
        {localBarcode && localBarcode.length > 0 && (
          <div className="mt-4 p-4 border rounded-lg bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-sm font-medium text-gray-700">Prévisualisation</h3>
              <button
                type="button"
                onClick={() => setShowBarcodes(!showBarcodes)}
                className="text-xs bg-white border border-gray-300 px-2 py-1 rounded text-gray-600 hover:bg-gray-50"
              >
                {showBarcodes ? 'Masquer' : 'Afficher'}
              </button>
            </div>

            {showBarcodes ? (
              <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-6">
                <div className="bg-white p-3 border border-gray-200 rounded">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">Code-barres EAN-13</h4>
                  <BarcodeSelector value={localBarcode} readOnly={true} showBoth={false} />
                </div>

                <div className="bg-white p-3 border border-gray-200 rounded">
                  <h4 className="text-xs font-medium text-gray-500 mb-2">QR Code</h4>
                  <QRCodeSVG value={localBarcode} size={128} level="M" />
                  <div className="flex space-x-2 mt-3">
                    <button
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        // Export SVG
                        const svg = document.querySelector('.bg-white.p-3 svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const svgBlob = new Blob([svgData], {
                            type: 'image/svg+xml;charset=utf-8',
                          });
                          const svgUrl = URL.createObjectURL(svgBlob);
                          const link = document.createElement('a');
                          link.href = svgUrl;
                          link.download = `qrcode-${localBarcode}.svg`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          URL.revokeObjectURL(svgUrl);
                        }
                      }}
                    >
                      SVG
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-blue-50 text-blue-600 rounded hover:bg-blue-100 transition-colors"
                      onClick={() => {
                        // Export PNG
                        const svg = document.querySelector('.bg-white.p-3 svg');
                        if (svg) {
                          const svgData = new XMLSerializer().serializeToString(svg);
                          const canvas = document.createElement('canvas');
                          canvas.width = 128;
                          canvas.height = 128;
                          const ctx = canvas.getContext('2d');
                          const img = new Image();
                          img.onload = () => {
                            ctx.drawImage(img, 0, 0);
                            const pngUrl = canvas.toDataURL('image/png');
                            const link = document.createElement('a');
                            link.href = pngUrl;
                            link.download = `qrcode-${localBarcode}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          };
                          img.src =
                            'data:image/svg+xml;base64,' +
                            btoa(unescape(encodeURIComponent(svgData)));
                        }
                      }}
                    >
                      PNG
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Valeur: {localBarcode}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

const CategoriesSection = ({
  product,
  editable,
  register,
  control,
  errors,
  specialFields,
  hierarchicalCategories,
}) => {
  if (!editable) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Catégories et relations
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
              Catégorie principale
            </h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.category_info?.primary ? (
                <>
                  {product.category_info.primary.name}
                  {product.category_info.primary.path_string &&
                    product.category_info.primary.path.length > 1 && (
                      <span className="text-xs text-gray-500 ml-2">
                        ({product.category_info.primary.path_string})
                      </span>
                    )}
                </>
              ) : (
                '-'
              )}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Marque</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.brand_ref?.name || 'Aucune'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Fournisseur</h3>
            <p className="mt-1 text-gray-900 dark:text-gray-100">
              {product.supplier_ref?.name || 'Aucun'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { watch, setValue } = useFormContext();
  const selectedBrandId = watch('brand_id');
  const selectedSupplierId = watch('supplier_id');

  const allBrands = specialFields.brand_id?.options || [];
  const allSuppliers = specialFields.supplier_id?.options || [];

  const filteredBrands = useMemo(() => {
    if (!selectedSupplierId) return allBrands;
    return allBrands.filter((brand) => brand.suppliers?.includes(selectedSupplierId));
  }, [selectedSupplierId, allBrands]);

  const filteredSuppliers = useMemo(() => {
    if (!selectedBrandId) return allSuppliers;
    return allSuppliers.filter((supplier) => supplier.brands?.includes(selectedBrandId));
  }, [selectedBrandId, allSuppliers]);

  // Reset l'autre champ si non valide
  useEffect(() => {
    const brand = allBrands.find((b) => b.value === selectedBrandId);
    if (selectedSupplierId && brand && !brand.suppliers?.includes(selectedSupplierId)) {
      setValue('brand_id', '');
    }
  }, [selectedSupplierId, allBrands, selectedBrandId, setValue]);

  useEffect(() => {
    const supplier = allSuppliers.find((s) => s.value === selectedSupplierId);
    if (selectedBrandId && supplier && !supplier.brands?.includes(selectedBrandId)) {
      setValue('supplier_id', '');
    }
  }, [selectedBrandId, allSuppliers, selectedSupplierId, setValue]);

  return (
    <div>
      <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
        Catégories et relations
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {/* Catégorie principale */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Catégorie principale
          </label>
          {control && (
            <Controller
              name="categories"
              control={control}
              render={({ field }) => (
                <MultiHierarchicalSelector
                  hierarchicalData={hierarchicalCategories}
                  values={field.value || []}
                  onChange={field.onChange}
                  currentSelected={product ? [product.category_id].filter(Boolean) : []}
                  placeholder="Sélectionner des catégories additionnelles"
                />
              )}
            />
          )}
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Cliquez sur une catégorie pour la sélectionner/désélectionner
          </p>
          {errors?.categories && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {errors.categories.message}
            </p>
          )}
        </div>

        {/* Marque */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Marque
          </label>
          <select
            {...register('brand_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Sélectionner une marque</option>
            {filteredBrands.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors?.brand_id && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.brand_id.message}</p>
          )}
        </div>

        {/* Fournisseur */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Fournisseur
          </label>
          <select
            {...register('supplier_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="">Sélectionner un fournisseur</option>
            {filteredSuppliers.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          {errors?.supplier_id && (
            <p className="mt-1 text-sm text-red-600 dark:text-red-500">
              {errors.supplier_id.message}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

const InventoryTab = ({
  product,
  editable = false,
  register,
  control,
  errors,
  specialFields = {},
  hierarchicalCategories = [],
}) => {
  return (
    <div className="space-y-8">
      <StockSection product={product} editable={editable} register={register} errors={errors} />

      <BarcodeSection product={product} editable={editable} register={register} errors={errors} />

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
