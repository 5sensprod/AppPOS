// src/features/labels/utils/dataBinding.js
// Binding + templating avec formatage contextuel du prix (texte => "€" ajouté).

/** 🔢→💶 Formatte un prix en EUR pour affichage texte */
export const formatPriceEUR = (val) => {
  if (val == null) return '';

  let num;
  if (typeof val === 'number' && Number.isFinite(val)) {
    num = val;
  } else {
    // Essayez de parser une string "3990", "3 990", "3,990"...
    num = Number(
      String(val)
        .replace(/[^\d,.-]/g, '')
        .replace(',', '.')
    );
  }

  if (Number.isFinite(num)) {
    // Si le prix est rond (pas de décimales), afficher sans décimales
    if (num % 1 === 0) {
      return `${num.toLocaleString('fr-FR')} €`;
    }
    // Sinon, afficher avec 2 décimales
    return `${num.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
  }

  const s = String(val);
  return s.endsWith('€') ? s : `${s} €`;
};

/** Cherche une valeur “propre” dans meta_data [{key,value}, ...] */
const getMeta = (product, key) => {
  try {
    return product?.meta_data?.find?.((m) => m?.key === key)?.value ?? product?.meta?.[key] ?? '';
  } catch {
    return '';
  }
};

/** Récupère la 1ère *SRC* d’image probable (priorité au chemin local) */
const getFirstImageSrc = (p) =>
  p?.image?.src || p?.gallery_images?.find?.((g) => g?.src)?.src || '';

/** (optionnel) URL publique si besoin (non utilisée ici) */
const getFirstImageUrl = (p) =>
  p?.image?.url || p?.gallery_images?.find?.((g) => g?.url)?.url || '';

/** Valeurs “brutes” d’un produit (sans formatage de présentation) */
export const getProductField = (product, key) => {
  if (!product || !key) return '';

  switch (key) {
    case 'name':
      return product.name ?? '';
    case 'price':
      return product.price ?? ''; // ⚠️ brut ici (pas de "€"), le formatage se fait plus bas selon le contexte
    case 'brand':
      return product.brand_ref?.name ?? product.brand?.name ?? '';
    case 'sku':
      return product.sku ?? '';
    case 'stock':
      return product.stock ?? '';
    case 'supplier':
      return product.supplier_ref?.name ?? product.supplier?.name ?? '';
    case 'website_url':
      return product.website_url ?? '';
    case 'barcode':
      return getMeta(product, 'barcode') ?? '';

    // Images (SRC d'abord)
    case 'product_image':
    case 'product_image_src':
      return getFirstImageSrc(product) ?? '';
    case 'product_image_url':
      return getFirstImageUrl(product) ?? '';

    // alias explicites
    case 'image.src':
    case 'image_src':
      return product?.image?.src ?? '';
    case 'image.url':
    case 'image_url':
      return product?.image?.url ?? '';

    default: {
      // Accès profond: ex. "brand_ref.name" ou "meta_data.0.value"
      try {
        return key.split('.').reduce((acc, k) => (acc != null ? acc[k] : ''), product) ?? '';
      } catch {
        return '';
      }
    }
  }
};

/** Remplace {{chemin}} par la valeur du produit (+ formatage contextuel) */
export const resolveTemplate = (tpl, product, options = {}) => {
  if (!tpl || typeof tpl !== 'string') return tpl;
  const isTextContext = options?.type === 'text';

  return tpl.replace(/\{\{\s*([\w.[\]]+)\s*\}\}/g, (_, path) => {
    try {
      // Aliases utiles
      if (path === 'barcode') return getProductField(product, 'barcode');
      if (path === 'product_image') return getProductField(product, 'product_image_src');

      // Valeur brute
      const raw = path.split('.').reduce((acc, key) => (acc != null ? acc[key] : ''), product);

      // 💶 Prix formaté uniquement en contexte texte
      if (isTextContext && path === 'price') return formatPriceEUR(raw);

      return raw ?? '';
    } catch {
      return '';
    }
  });
};

/**
 * Renvoie la valeur finale affichable pour une propriété d’un élément.
 * Priorité:
 * 1) el.dataBinding si présent (avec formatage si texte & price)
 * 2) templating dans la valeur (string avec {{...}}) — appliqué avec contexte du type d'élément
 * 3) valeur telle quelle
 */
export const resolvePropForElement = (elProp, el, product) => {
  // 1) dataBinding prioritaire
  if (el?.dataBinding) {
    const raw = getProductField(product, el.dataBinding);
    // 💶 Si c'est du texte et que le binding est "price" => ajouter "€"
    if (el?.type === 'text' && el.dataBinding === 'price') {
      return formatPriceEUR(raw);
    }
    return raw;
  }

  // 2) templating {{...}} avec contexte
  if (typeof elProp === 'string') {
    return resolveTemplate(elProp, product, { type: el?.type });
  }

  // 3) brut
  return elProp;
};
