// ✅ Hook : usePriceCalculations.js
import { useState } from 'react';

export function usePriceCalculations({ watch, setValue, product }) {
  const [calculationMode, setCalculationMode] = useState('from_cost');
  const [marginType, setMarginType] = useState('percentage');
  const [promoType, setPromoType] = useState('percentage');

  const watchedValues = watch
    ? {
        purchase_price: watch('purchase_price'),
        price: watch('price'),
        regular_price: watch('regular_price'),
        sale_price: watch('sale_price'),
        tax_rate: watch('tax_rate'),
        margin_rate: watch('margin_rate'),
        margin_amount: watch('margin_amount'),
        promo_rate: watch('promo_rate'),
        promo_amount: watch('promo_amount'),
      }
    : {};

  const calculatePrices = (sourceField, value) => {
    const taxRate = watchedValues.tax_rate || 20;
    const taxMultiplier = 1 + taxRate / 100;

    if (calculationMode === 'from_cost' && sourceField === 'purchase_price') {
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

  const handlePromoCalculation = (field, value) => {
    const regularPrice = watchedValues.regular_price || watchedValues.price || 0;

    if (field === 'promo_rate' && promoType === 'percentage') {
      const promoRate = parseFloat(value) || 0;
      const salePrice = regularPrice * (1 - promoRate / 100);
      const promoAmount = regularPrice - salePrice;

      setValue('sale_price', Math.round(salePrice * 100) / 100);
      setValue('promo_amount', Math.round(promoAmount * 100) / 100);
    } else if (field === 'promo_amount' && promoType === 'amount') {
      const promoAmount = parseFloat(value) || 0;
      const salePrice = Math.max(0, regularPrice - promoAmount);
      const promoRate = regularPrice > 0 ? (promoAmount / regularPrice) * 100 : 0;

      setValue('sale_price', Math.round(salePrice * 100) / 100);
      setValue('promo_rate', Math.round(promoRate * 100) / 100);
    } else if (field === 'sale_price') {
      const salePrice = parseFloat(value) || 0;
      const promoAmount = Math.max(0, regularPrice - salePrice);
      const promoRate = regularPrice > 0 ? (promoAmount / regularPrice) * 100 : 0;

      setValue('promo_amount', Math.round(promoAmount * 100) / 100);
      setValue('promo_rate', Math.round(promoRate * 100) / 100);
    } else if (field === 'regular_price' || field === 'price') {
      const newRegularPrice = field === 'regular_price' ? parseFloat(value) || 0 : regularPrice;
      const currentPromoRate = watchedValues.promo_rate || 0;

      if (currentPromoRate > 0) {
        const newSalePrice = newRegularPrice * (1 - currentPromoRate / 100);
        const newPromoAmount = newRegularPrice - newSalePrice;

        setValue('sale_price', Math.round(newSalePrice * 100) / 100);
        setValue('promo_amount', Math.round(newPromoAmount * 100) / 100);
      }
    }
  };

  const handleFieldChange = (field, value) => {
    if (!setValue) return;

    if (calculationMode === 'from_cost') {
      if (['purchase_price', 'tax_rate', 'margin_rate', 'margin_amount'].includes(field)) {
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

    handlePromoCalculation(field, value);
  };

  const getCalculatedValues = () => {
    const price = watchedValues.price || product?.price || 0;
    const regularPrice = watchedValues.regular_price || product?.regular_price || price;
    const salePrice = watchedValues.sale_price || product?.sale_price || 0;
    const purchasePrice = watchedValues.purchase_price || product?.purchase_price || 0;
    const taxRate = watchedValues.tax_rate || product?.tax_rate || 20;

    const priceTTC = price;
    const priceHT = priceTTC / (1 + taxRate / 100);
    const marginAmount = priceHT - purchasePrice;
    const marginRate = purchasePrice > 0 ? (marginAmount / purchasePrice) * 100 : 0;
    const taxAmount = priceTTC - priceHT;

    const regularPriceHT = regularPrice / (1 + taxRate / 100);
    const regularMarginAmount = regularPriceHT - purchasePrice;
    const regularMarginRate = purchasePrice > 0 ? (regularMarginAmount / purchasePrice) * 100 : 0;

    const promoAmount = Math.max(0, regularPrice - salePrice);
    const promoRate = regularPrice > 0 ? (promoAmount / regularPrice) * 100 : 0;
    const hasPromo = salePrice > 0 && salePrice < regularPrice;

    const salePriceHT = salePrice / (1 + taxRate / 100);
    const promoMarginAmount = salePriceHT - purchasePrice;
    const promoMarginRate = purchasePrice > 0 ? (promoMarginAmount / purchasePrice) * 100 : 0;

    return {
      priceTTC: Math.round(priceTTC * 100) / 100,
      priceHT: Math.round(priceHT * 100) / 100,
      regularPrice: Math.round(regularPrice * 100) / 100,
      regularPriceHT: Math.round(regularPriceHT * 100) / 100,
      salePrice: Math.round(salePrice * 100) / 100,
      salePriceHT: Math.round(salePriceHT * 100) / 100,
      purchasePrice: Math.round(purchasePrice * 100) / 100,
      marginAmount: Math.round(marginAmount * 100) / 100,
      marginRate: Math.round(marginRate * 100) / 100,
      regularMarginAmount: Math.round(regularMarginAmount * 100) / 100,
      regularMarginRate: Math.round(regularMarginRate * 100) / 100,
      promoMarginAmount: Math.round(promoMarginAmount * 100) / 100,
      promoMarginRate: Math.round(promoMarginRate * 100) / 100,
      taxAmount: Math.round(taxAmount * 100) / 100,
      taxRate,
      promoAmount: Math.round(promoAmount * 100) / 100,
      promoRate: Math.round(promoRate * 100) / 100,
      hasPromo,
    };
  };

  return {
    calculationMode,
    setCalculationMode,
    marginType,
    setMarginType,
    promoType,
    setPromoType,
    watchedValues,
    handleFieldChange,
    getCalculatedValues,
  };
}
