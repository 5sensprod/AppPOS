// ProductPriceSection.jsx avec logique de calcul intelligente
import React, { useState, useEffect } from 'react';
import { Calculator, ArrowRight } from 'lucide-react';

const ProductPriceSection = ({ product, editable = false, register, errors, watch, setValue }) => {
  const [calculationMode, setCalculationMode] = useState('from_cost'); // 'from_cost' ou 'from_price'
  const [marginType, setMarginType] = useState('percentage'); // 'percentage' ou 'amount'

  // Options pour le taux de TVA
  const taxRateOptions = [
    { value: '', label: 'Sélectionner un taux' },
    { value: 20, label: '20%' },
    { value: 5.5, label: '5,5%' },
    { value: 0, label: '0%' },
  ];

  // Surveiller les changements pour recalculer automatiquement
  const watchedValues = watch
    ? {
        purchase_price: watch('purchase_price'),
        price: watch('price'),
        tax_rate: watch('tax_rate'),
        margin_rate: watch('margin_rate'),
        margin_amount: watch('margin_amount'),
      }
    : {};

  // Fonction de calcul automatique
  const calculatePrices = (sourceField, value) => {
    const taxRate = watchedValues.tax_rate || 20;
    const taxMultiplier = 1 + taxRate / 100;

    if (calculationMode === 'from_cost' && sourceField === 'purchase_price') {
      // Calcul à partir du prix d'achat
      const purchasePriceHT = parseFloat(value) || 0;

      if (marginType === 'percentage') {
        const marginRate = watchedValues.margin_rate || 0;
        const sellPriceHT = purchasePriceHT * (1 + marginRate / 100);
        const sellPriceTTC = sellPriceHT * taxMultiplier;

        setValue && setValue('price', Math.round(sellPriceTTC * 100) / 100);
        setValue &&
          setValue('margin_amount', Math.round((sellPriceHT - purchasePriceHT) * 100) / 100);
      } else {
        const marginAmount = watchedValues.margin_amount || 0;
        const sellPriceHT = purchasePriceHT + marginAmount;
        const sellPriceTTC = sellPriceHT * taxMultiplier;
        const marginRate =
          purchasePriceHT > 0 ? ((sellPriceHT - purchasePriceHT) / purchasePriceHT) * 100 : 0;

        setValue && setValue('price', Math.round(sellPriceTTC * 100) / 100);
        setValue && setValue('margin_rate', Math.round(marginRate * 100) / 100);
      }
    } else if (calculationMode === 'from_price' && sourceField === 'price') {
      // Calcul à partir du prix de vente TTC
      const sellPriceTTC = parseFloat(value) || 0;
      const sellPriceHT = sellPriceTTC / taxMultiplier;
      const purchasePriceHT = watchedValues.purchase_price || 0;

      if (purchasePriceHT > 0) {
        const marginAmount = sellPriceHT - purchasePriceHT;
        const marginRate = ((sellPriceHT - purchasePriceHT) / purchasePriceHT) * 100;

        setValue && setValue('margin_amount', Math.round(marginAmount * 100) / 100);
        setValue && setValue('margin_rate', Math.round(marginRate * 100) / 100);
      }
    }
  };

  // Gestionnaires de changement pour recalcul automatique
  const handleFieldChange = (field, value) => {
    if (calculationMode === 'from_cost') {
      if (['purchase_price', 'tax_rate', 'margin_rate', 'margin_amount'].includes(field)) {
        // Recalculer le prix de vente à partir des autres valeurs
        const purchasePrice =
          field === 'purchase_price' ? parseFloat(value) || 0 : watchedValues.purchase_price || 0;
        const taxRate =
          field === 'tax_rate' ? parseFloat(value) || 20 : watchedValues.tax_rate || 20;
        const taxMultiplier = 1 + taxRate / 100;

        if (field === 'margin_rate' || (marginType === 'percentage' && field !== 'margin_amount')) {
          const marginRate =
            field === 'margin_rate' ? parseFloat(value) || 0 : watchedValues.margin_rate || 0;
          const sellPriceHT = purchasePrice * (1 + marginRate / 100);
          const sellPriceTTC = sellPriceHT * taxMultiplier;
          const marginAmount = sellPriceHT - purchasePrice;

          setValue('price', Math.round(sellPriceTTC * 100) / 100);
          setValue('margin_amount', Math.round(marginAmount * 100) / 100);
        } else if (
          field === 'margin_amount' ||
          (marginType === 'amount' && field !== 'margin_rate')
        ) {
          const marginAmount =
            field === 'margin_amount' ? parseFloat(value) || 0 : watchedValues.margin_amount || 0;
          const sellPriceHT = purchasePrice + marginAmount;
          const sellPriceTTC = sellPriceHT * taxMultiplier;
          const marginRate = purchasePrice > 0 ? (marginAmount / purchasePrice) * 100 : 0;

          setValue('price', Math.round(sellPriceTTC * 100) / 100);
          setValue('margin_rate', Math.round(marginRate * 100) / 100);
        } else {
          // Recalcul général pour purchase_price ou tax_rate
          calculatePrices('purchase_price', purchasePrice);
        }
      }
    } else if (calculationMode === 'from_price') {
      if (['price', 'tax_rate'].includes(field)) {
        const sellPriceTTC = field === 'price' ? parseFloat(value) || 0 : watchedValues.price || 0;
        const taxRate =
          field === 'tax_rate' ? parseFloat(value) || 20 : watchedValues.tax_rate || 20;
        const sellPriceHT = sellPriceTTC / (1 + taxRate / 100);
        const purchasePriceHT = watchedValues.purchase_price || 0;

        if (purchasePriceHT > 0) {
          const marginAmount = sellPriceHT - purchasePriceHT;
          const marginRate = (marginAmount / purchasePriceHT) * 100;

          setValue('margin_amount', Math.round(marginAmount * 100) / 100);
          setValue('margin_rate', Math.round(marginRate * 100) / 100);
        }
      }
    }
  };

  // Calculer les valeurs dérivées pour l'affichage
  const getCalculatedValues = () => {
    const price = watchedValues.price || product?.price || 0;
    const purchasePrice = watchedValues.purchase_price || product?.purchase_price || 0;
    const taxRate = watchedValues.tax_rate || product?.tax_rate || 20;

    const priceTTC = price;
    const priceHT = priceTTC / (1 + taxRate / 100);
    const marginAmount = priceHT - purchasePrice;
    const marginRate = purchasePrice > 0 ? (marginAmount / purchasePrice) * 100 : 0;
    const taxAmount = priceTTC - priceHT;

    return {
      priceTTC: Math.round(priceTTC * 100) / 100,
      priceHT: Math.round(priceHT * 100) / 100,
      purchasePrice: Math.round(purchasePrice * 100) / 100,
      marginAmount: Math.round(marginAmount * 100) / 100,
      marginRate: Math.round(marginRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate,
    };
  };

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

      {/* Champs optionnels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Prix régulier TTC (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            {...register('regular_price')}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Prix avant promotion (optionnel)
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
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            placeholder="0.00"
          />
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Prix en promotion (optionnel)
          </p>
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
