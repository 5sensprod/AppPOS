import React from 'react';
import { Calculator, ArrowRight } from 'lucide-react';
import { usePriceCalculations } from '../../hooks/usePriceCalculations';

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

  const calculated = getCalculatedValues();

  if (!editable) {
    return (
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Prix et marges
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
            <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300">
              Prix d'achat HT
            </h3>
            <p className="text-lg font-bold text-blue-900 dark:text-blue-100">
              {calculated.purchasePrice}€
            </p>
          </div>

          <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
            <h3 className="text-sm font-medium text-green-700 dark:text-green-300">
              Prix vente HT
            </h3>
            <p className="text-lg font-bold text-green-900 dark:text-green-100">
              {calculated.priceHT}€
            </p>
          </div>

          <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
            <h3 className="text-sm font-medium text-purple-700 dark:text-purple-300">
              Prix vente TTC
            </h3>
            <p className="text-lg font-bold text-purple-900 dark:text-purple-100">
              {calculated.priceTTC}€
            </p>
          </div>

          {calculated.regularPrice !== calculated.priceTTC && (
            <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
              <h3 className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Prix régulier TTC
              </h3>
              <p className="text-lg font-bold text-orange-900 dark:text-orange-100">
                {calculated.regularPrice}€
              </p>
            </div>
          )}

          {calculated.hasPromo && (
            <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
              <h3 className="text-sm font-medium text-red-700 dark:text-red-300">
                Prix promotionnel
              </h3>
              <p className="text-lg font-bold text-red-900 dark:text-red-100">
                {calculated.salePrice}€
              </p>
              <p className="text-xs text-red-600 dark:text-red-400">
                -{calculated.promoAmount}€ ({calculated.promoRate}%)
              </p>
              <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">
                Marge promo: {calculated.promoMarginAmount}€ ({calculated.promoMarginRate}%)
              </p>
            </div>
          )}

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Marge</h3>
            <p className="text-gray-900 dark:text-gray-100">
              {calculated.marginAmount}€ ({calculated.marginRate}%)
            </p>
          </div>

          <div>
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">TVA</h3>
            <p className="text-gray-900 dark:text-gray-100">
              {calculated.taxAmount}€ ({calculated.taxRate}%)
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Prix et marges</h2>

        <div className="flex items-center space-x-2">
          <Calculator className="h-4 w-4 text-gray-500" />
          <select
            value={calculationMode}
            onChange={(e) => setCalculationMode(e.target.value)}
            className="text-sm border border-gray-300 rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="from_cost">Calcul depuis le coût</option>
            <option value="from_price">Calcul depuis le prix de vente</option>
          </select>
        </div>
      </div>

      {/* Mode de calcul depuis le coût */}
      {calculationMode === 'from_cost' && (
        <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg mb-4">
          <div className="flex items-center mb-3">
            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
              📊 Calcul automatique depuis le prix d'achat
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prix d'achat HT (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('purchase_price')}
                onChange={(e) => handleFieldChange('purchase_price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TVA
              </label>
              <select
                {...register('tax_rate')}
                onChange={(e) => handleFieldChange('tax_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {taxRateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Marge
                </label>
                <select
                  value={marginType}
                  onChange={(e) => setMarginType(e.target.value)}
                  className="ml-2 text-xs border border-gray-300 rounded px-1 dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="percentage">%</option>
                  <option value="amount">€</option>
                </select>
              </div>

              {marginType === 'percentage' ? (
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  {...register('margin_rate')}
                  onChange={(e) => handleFieldChange('margin_rate', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0.0"
                />
              ) : (
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  {...register('margin_amount')}
                  onChange={(e) => handleFieldChange('margin_amount', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0.00"
                />
              )}
            </div>

            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Prix de vente TTC</div>
                <div className="text-lg font-bold text-green-600 dark:text-green-400">
                  {calculated.priceTTC}€
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mode de calcul depuis le prix de vente */}
      {calculationMode === 'from_price' && (
        <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg mb-4">
          <div className="flex items-center mb-3">
            <span className="text-sm font-medium text-green-700 dark:text-green-300">
              💰 Calcul de marge depuis le prix de vente
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prix d'achat HT (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('purchase_price')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Prix vente TTC (€) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('price')}
                onChange={(e) => handleFieldChange('price', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                TVA
              </label>
              <select
                {...register('tax_rate')}
                onChange={(e) => handleFieldChange('tax_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              >
                {taxRateOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <ArrowRight className="h-4 w-4 text-gray-400 mr-2" />
              <div>
                <div className="text-xs text-gray-500">Marge calculée</div>
                <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {calculated.marginAmount}€
                </div>
                <div className="text-sm text-gray-500">({calculated.marginRate}%)</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Champs optionnels et promotions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prix régulier TTC (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('regular_price')}
            onChange={(e) => handleFieldChange('regular_price', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Prix avant promotion (par défaut = prix de vente)
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prix promo TTC (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('sale_price')}
            onChange={(e) => handleFieldChange('sale_price', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Prix en promotion (calculé automatiquement)
          </p>
        </div>
      </div>

      {/* Section promotions avancées */}
      <div className="bg-orange-50 dark:bg-orange-900/10 p-4 rounded-lg mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-orange-700 dark:text-orange-300 flex items-center">
            🏷️ Calculateur de promotion
          </h3>
          <select
            value={promoType}
            onChange={(e) => setPromoType(e.target.value)}
            className="text-sm border border-orange-300 rounded px-2 py-1 dark:bg-gray-700 dark:border-gray-600"
          >
            <option value="percentage">Réduction en %</option>
            <option value="amount">Réduction en €</option>
          </select>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {promoType === 'percentage' ? 'Réduction (%)' : 'Réduction (€)'}
            </label>
            {promoType === 'percentage' ? (
              <input
                type="number"
                step="0.1"
                min="0"
                max="100"
                {...register('promo_rate')}
                onChange={(e) => handleFieldChange('promo_rate', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="0.0"
              />
            ) : (
              <input
                type="number"
                step="0.01"
                min="0"
                {...register('promo_amount')}
                onChange={(e) => handleFieldChange('promo_amount', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                placeholder="0.00"
              />
            )}
          </div>

          <div className="flex items-center">
            <ArrowRight className="h-4 w-4 text-gray-400 mr-2" />
            <div>
              <div className="text-xs text-gray-500">Prix après promo</div>
              <div className="text-lg font-bold text-red-600 dark:text-red-400">
                {calculated.salePrice}€
              </div>
              {calculated.hasPromo && (
                <>
                  <div className="text-sm text-green-600">Économie: {calculated.promoAmount}€</div>
                  <div className="text-xs text-orange-600 mt-1">
                    Marge promo: {calculated.promoMarginAmount}€ ({calculated.promoMarginRate}%)
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
                {calculated.promoAmount}€ ({calculated.promoRate}%)
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
            <div className="font-medium">{calculated.purchasePrice}€</div>
          </div>
          <div>
            <span className="text-gray-500">Vente HT:</span>
            <div className="font-medium">{calculated.priceHT}€</div>
          </div>
          <div>
            <span className="text-gray-500">TVA:</span>
            <div className="font-medium">{calculated.taxAmount}€</div>
          </div>
          <div>
            <span className="text-gray-500">Vente TTC:</span>
            <div className="font-medium">{calculated.priceTTC}€</div>
          </div>
          <div>
            <span className="text-gray-500">Marge:</span>
            <div className="font-medium text-green-600">
              {calculated.marginAmount}€ ({calculated.marginRate}%)
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductPriceSection;
