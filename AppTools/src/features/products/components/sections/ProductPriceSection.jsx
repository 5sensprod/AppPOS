// src/features/products/components/sections/ProductPriceSection.jsx
import React from 'react';
import { Calculator, ArrowRight, TrendingUp, Tag } from 'lucide-react';
import { NumberInput, SelectField } from '../../../../components/atoms/Input';
import { usePriceCalculations } from '../../hooks/usePriceCalculations';
import { formatCurrency, formatPercentage } from '../../../../utils/formatters';

const ProductPriceSection = ({ product, editable = false, register, errors, watch, setValue }) => {
  const {
    calculationMode,
    setCalculationMode,
    marginType,
    setMarginType,
    promoType,
    setPromoType,
    handleFieldChange,
    getCalculatedValues,
  } = usePriceCalculations({ watch, setValue, product });

  // Options pour le taux de TVA
  const taxRateOptions = [
    { value: '', label: 'Sélectionner un taux' },
    { value: 20, label: '20%' },
    { value: 5.5, label: '5,5%' },
    { value: 0, label: '0%' },
  ];

  // Options pour le mode de calcul
  const calculationModeOptions = [
    { value: 'from_cost', label: 'Calcul depuis le coût' },
    { value: 'from_price', label: 'Calcul depuis le prix de vente' },
  ];

  // Options pour le type de marge
  const marginTypeOptions = [
    { value: 'percentage', label: '%' },
    { value: 'amount', label: '€' },
  ];

  // Options pour le type de promotion
  const promoTypeOptions = [
    { value: 'percentage', label: 'Réduction en %' },
    { value: 'amount', label: 'Réduction en €' },
  ];

  const calculated = getCalculatedValues();

  if (!editable) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-6">
          <div className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            <span>Prix et marges</span>
          </div>
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Prix d'achat HT
            </h3>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {formatCurrency(calculated.purchasePrice)}
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <h3 className="text-sm font-medium text-green-700 dark:text-green-300">
              Prix vente HT
            </h3>
            <p className="text-lg font-bold text-green-900 dark:text-green-100">
              {formatCurrency(calculated.priceHT)}
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Prix vente TTC
            </h3>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {formatCurrency(calculated.priceTTC)}
            </p>
          </div>

          {calculated.regularPrice !== calculated.priceTTC && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <h3 className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Prix régulier TTC
              </h3>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {formatCurrency(calculated.regularPrice)}
              </p>
            </div>
          )}

          {calculated.hasPromo && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-300">
                Prix promotionnel
              </h3>
              <p className="text-lg font-bold text-red-900 dark:text-red-100">
                {formatCurrency(calculated.salePrice)}
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                -{formatCurrency(calculated.promoAmount)} ({formatPercentage(calculated.promoRate)})
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Marge promo: {formatCurrency(calculated.promoMarginAmount)} (
                {formatPercentage(calculated.promoMarginRate)})
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Marge</h3>
            <p className="text-gray-900 dark:text-gray-100">
              {formatCurrency(calculated.marginAmount)} ({formatPercentage(calculated.marginRate)})
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">TVA</h3>
            <p className="text-gray-900 dark:text-gray-100">
              {formatCurrency(calculated.taxAmount)} ({formatPercentage(calculated.taxRate)})
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          <div className="flex items-center">
            <Calculator className="h-5 w-5 mr-2" />
            <span>Prix et marges</span>
          </div>
        </h2>

        <div className="flex items-center space-x-2">
          <SelectField
            name="calculation_mode_select"
            value={calculationMode}
            onChange={(e) => setCalculationMode(e.target.value)}
            options={calculationModeOptions}
            placeholder="Mode de calcul"
            editable={true}
            className="min-w-[200px]"
            icon={Calculator}
          />
        </div>
      </div>

      {/* Mode de calcul depuis le coût */}
      {calculationMode === 'from_cost' && (
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg mb-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Calcul automatique depuis le prix d'achat
            </span>
          </div>

          <div className="space-y-4">
            {/* Labels */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prix d'achat HT (€) <span className="text-red-500">*</span>
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                TVA
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Marge
              </label>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Prix de vente TTC
              </label>
            </div>

            {/* Champs d'input */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
              <NumberInput
                name="purchase_price"
                placeholder="0.00"
                editable={true}
                required={true}
                allowDecimals={true}
                onChange={(e) => handleFieldChange('purchase_price', e.target.value)}
              />

              <SelectField
                name="tax_rate"
                options={taxRateOptions}
                placeholder="Sélectionner un taux"
                editable={true}
                value={watch('tax_rate') || ''}
                onChange={(e) => {
                  setValue('tax_rate', e.target.value);
                  handleFieldChange('tax_rate', e.target.value);
                }}
                error={errors?.tax_rate?.message}
              />

              <div className="flex items-center space-x-2">
                {marginType === 'percentage' ? (
                  <NumberInput
                    name="margin_rate"
                    placeholder="0.0"
                    editable={true}
                    allowDecimals={true}
                    min={0}
                    onChange={(e) => handleFieldChange('margin_rate', e.target.value)}
                    className="flex-1"
                  />
                ) : (
                  <NumberInput
                    name="margin_amount"
                    placeholder="0.00"
                    editable={true}
                    allowDecimals={true}
                    currency={true}
                    min={0}
                    onChange={(e) => handleFieldChange('margin_amount', e.target.value)}
                    className="flex-1"
                  />
                )}
                <SelectField
                  name="margin_type_select"
                  value={marginType}
                  onChange={(e) => setMarginType(e.target.value)}
                  options={marginTypeOptions}
                  placeholder=""
                  editable={true}
                  className="w-16 flex-shrink-0"
                />
              </div>

              <div className="h-[38px] bg-green-50 dark:bg-green-900/20 rounded-md border border-green-200 dark:border-green-700 flex items-center justify-center">
                <span className="text-lg font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(calculated.priceTTC)}
                </span>
              </div>
            </div>

            {/* Texte d'aide sous le premier champ uniquement */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <p className="text-xs text-gray-500 dark:text-gray-400">Coût d'achat du produit</p>
              <div></div>
              <div></div>
              <div></div>
            </div>
          </div>
        </div>
      )}

      {/* Mode de calcul depuis le prix de vente */}
      {calculationMode === 'from_price' && (
        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg mb-6">
          <div className="flex items-center mb-4">
            <TrendingUp className="h-4 w-4 mr-2 text-green-600" />
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              Calcul de marge depuis le prix de vente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <NumberInput
              name="purchase_price"
              label="Prix d'achat HT (€)"
              placeholder="0.00"
              editable={true}
              allowDecimals={true}
              currency={true}
            />

            <NumberInput
              name="price"
              label="Prix vente TTC (€)"
              placeholder="0.00"
              editable={true}
              required={true}
              allowDecimals={true}
              currency={true}
              onChange={(e) => handleFieldChange('price', e.target.value)}
            />

            <SelectField
              name="tax_rate"
              label="TVA"
              options={taxRateOptions}
              placeholder="Sélectionner un taux"
              editable={true}
              value={watch('tax_rate') || ''}
              onChange={(e) => {
                setValue('tax_rate', e.target.value);
                handleFieldChange('tax_rate', e.target.value);
              }}
              error={errors?.tax_rate?.message}
            />

            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Marge calculée</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {formatCurrency(calculated.marginAmount)}
                </div>
                <div className="text-sm text-gray-500">
                  ({formatPercentage(calculated.marginRate)})
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Champs optionnels et promotions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <NumberInput
          name="regular_price"
          label="Prix régulier TTC (€)"
          placeholder="0.00"
          editable={true}
          allowDecimals={true}
          currency={true}
          onChange={(e) => handleFieldChange('regular_price', e.target.value)}
          helpText="Prix avant promotion (par défaut = prix de vente)"
        />

        <NumberInput
          name="sale_price"
          label="Prix promo TTC (€)"
          placeholder="0.00"
          editable={true}
          allowDecimals={true}
          currency={true}
          onChange={(e) => handleFieldChange('sale_price', e.target.value)}
          helpText="Prix en promotion (calculé automatiquement)"
        />
      </div>

      {/* Section promotions avancées */}
      <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center">
            <Tag className="h-4 w-4 mr-2" />
            Calculateur de promotion
          </h3>
          <SelectField
            name="promo_type_select"
            value={promoType}
            onChange={(e) => setPromoType(e.target.value)}
            options={promoTypeOptions}
            placeholder="Type de promotion"
            editable={true}
            className="min-w-[160px]"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            {promoType === 'percentage' ? (
              <NumberInput
                name="promo_rate"
                label="Réduction (%)"
                placeholder="0.0"
                editable={true}
                allowDecimals={true}
                min={0}
                max={100}
                onChange={(e) => handleFieldChange('promo_rate', e.target.value)}
              />
            ) : (
              <NumberInput
                name="promo_amount"
                label="Réduction (€)"
                placeholder="0.00"
                editable={true}
                allowDecimals={true}
                currency={true}
                min={0}
                onChange={(e) => handleFieldChange('promo_amount', e.target.value)}
              />
            )}
          </div>

          <div className="flex items-center">
            <ArrowRight className="h-4 w-4 text-gray-400 mr-2" />
            <div>
              <div className="text-xs text-gray-500">Prix après promo</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {formatCurrency(calculated.salePrice)}
              </div>
              {calculated.hasPromo && (
                <>
                  <div className="text-sm text-green-600">
                    Économie: {formatCurrency(calculated.promoAmount)}
                  </div>
                  <div className="text-xs text-orange-600 mt-1">
                    Marge promo: {formatCurrency(calculated.promoMarginAmount)} (
                    {formatPercentage(calculated.promoMarginRate)})
                  </div>
                  {calculated.promoMarginRate < 0 && (
                    <div className="text-xs text-red-600 font-medium">⚠️ Marge négative !</div>
                  )}
                </>
              )}
            </div>
          </div>

          <div className="flex items-center">
            <div>
              <div className="text-xs text-gray-500">Réduction calculée</div>
              <div className="text-sm font-medium text-orange-600 dark:text-orange-400">
                {formatCurrency(calculated.promoAmount)} ({formatPercentage(calculated.promoRate)})
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Récapitulatif des calculs */}
      <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Récapitulatif</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
          <div>
            <span className="text-gray-500">Achat HT:</span>
            <div className="font-medium">{formatCurrency(calculated.purchasePrice)}</div>
          </div>
          <div>
            <span className="text-gray-500">Vente HT:</span>
            <div className="font-medium">{formatCurrency(calculated.priceHT)}</div>
          </div>
          <div>
            <span className="text-gray-500">TVA:</span>
            <div className="font-medium">{formatCurrency(calculated.taxAmount)}</div>
          </div>
          <div>
            <span className="text-gray-500">Vente TTC:</span>
            <div className="font-medium">{formatCurrency(calculated.priceTTC)}</div>
          </div>
          <div>
            <span className="text-gray-500">Marge:</span>
            <div className="font-medium text-green-600">
              {formatCurrency(calculated.marginAmount)} ({formatPercentage(calculated.marginRate)})
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPriceSection;
