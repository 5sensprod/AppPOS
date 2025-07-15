// src/features/products/hooks/useProductFilters.js
import { useMemo } from 'react';
import { useEntityFilter } from '@/hooks/useEntityFilter';

// ✅ NOUVEAU - Fonctions utilitaires pour les codes-barres
/**
 * Valide un code-barres UPC-A (12 chiffres)
 * @param {string} barcode - Le code-barres à valider
 * @returns {boolean} - True si le code-barres UPC-A est valide
 */
const isValidUPC = (barcode) => {
  if (!barcode || typeof barcode !== 'string') return false;

  const cleaned = barcode.replace(/[\s-]/g, '');
  if (!/^\d{12}$/.test(cleaned)) return false;

  // Calcul de la clé de contrôle UPC-A
  let sum = 0;
  for (let i = 0; i < 11; i++) {
    const digit = parseInt(cleaned[i]);
    sum += i % 2 === 0 ? digit * 3 : digit;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[11]);
};

/**
 * Valide un code-barres EAN-13 (13 chiffres)
 * @param {string} barcode - Le code-barres à valider
 * @returns {boolean} - True si le code-barres EAN-13 est valide
 */
const isValidEAN13 = (barcode) => {
  if (!barcode || typeof barcode !== 'string') return false;

  const cleaned = barcode.replace(/[\s-]/g, '');
  if (!/^\d{13}$/.test(cleaned)) return false;

  // Calcul de la clé de contrôle EAN-13
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(cleaned[i]);
    sum += i % 2 === 0 ? digit : digit * 3;
  }

  const checkDigit = (10 - (sum % 10)) % 10;
  return checkDigit === parseInt(cleaned[12]);
};

/**
 * Valide un code-barres (UPC-A ou EAN-13)
 * @param {string} barcode - Le code-barres à valider
 * @returns {boolean} - True si le code-barres est valide
 */
const isValidBarcode = (barcode) => {
  if (!barcode || typeof barcode !== 'string') return false;

  const cleaned = barcode.replace(/[\s-]/g, '');

  // Vérifier UPC-A (12 chiffres) ou EAN-13 (13 chiffres)
  if (cleaned.length === 12) {
    return isValidUPC(cleaned);
  } else if (cleaned.length === 13) {
    return isValidEAN13(cleaned);
  }

  return false;
};

/**
 * Extrait le code-barres des meta_data d'un produit
 * @param {Object} product - L'objet produit
 * @returns {string} - Le code-barres ou chaîne vide
 */
const extractBarcode = (product) => {
  if (!product?.meta_data || !Array.isArray(product.meta_data)) return '';

  const barcodeItem = product.meta_data.find((item) => item.key === 'barcode');
  return barcodeItem ? (barcodeItem.value || '').toString().trim() : '';
};

export const useProductFilters = (products = []) => {
  const { selectedFilters, setSelectedFilters } = useEntityFilter('product');

  // Préparation des options de filtre pour les produits
  const filterOptions = useMemo(() => {
    const wooOptions = [
      { label: 'Synchronisé', value: 'woo_synced', type: 'woo' },
      { label: 'Non synchronisé', value: 'woo_unsynced', type: 'woo' },
    ];

    const statusOptions = [
      { label: 'Publié', value: 'status_published', type: 'status' },
      { label: 'Brouillon', value: 'status_draft', type: 'status' },
      { label: 'Archivé', value: 'status_archived', type: 'status' },
    ];

    const imageOptions = [
      { label: 'Avec image', value: 'has_image', type: 'image' },
      { label: 'Sans image', value: 'no_image', type: 'image' },
      { label: 'Images trop petites (<800px)', value: 'small_image', type: 'image' },
    ];

    const descriptionOptions = [
      { label: 'Avec description', value: 'has_description', type: 'description' },
      { label: 'Sans description', value: 'no_description', type: 'description' },
    ];

    // ✅ NOUVEAU - Options de filtre Code barre
    const barcodeOptions = [
      { label: 'Avec code barre', value: 'has_barcode', type: 'barcode' },
      { label: 'Sans code barre', value: 'no_barcode', type: 'barcode' },
      { label: 'Code barre invalide', value: 'invalid_barcode', type: 'barcode' },
    ];

    // Extraction des options de marque depuis les produits
    const brandOptions = Array.from(
      new Map(
        products
          .map((p) => p.brand_ref)
          .filter(Boolean)
          .map((b) => [b.id, { value: `brand_${b.id}`, label: b.name, type: 'brand' }])
      ).values()
    );

    // Extraction des options de fournisseur depuis les produits
    const supplierOptions = Array.from(
      new Map(
        products
          .map((p) => p.supplier_ref)
          .filter(Boolean)
          .map((s) => [s.id, { value: `supplier_${s.id}`, label: s.name, type: 'supplier' }])
      ).values()
    );

    return [
      ...wooOptions,
      ...statusOptions,
      ...imageOptions,
      ...descriptionOptions,
      ...barcodeOptions, // ✅ NOUVEAU - Ajout des options code barre
      ...brandOptions,
      ...supplierOptions,
    ];
  }, [products]);

  // Filtrage des produits selon les filtres sélectionnés
  const filterProducts = (localProducts) => {
    let data = localProducts;

    const wooFilter = selectedFilters.find((f) => f.type === 'woo')?.value;
    const imageFilter = selectedFilters.find((f) => f.type === 'image')?.value;
    const supplierFilters = selectedFilters.filter((f) => f.type === 'supplier');
    const brandFilters = selectedFilters.filter((f) => f.type === 'brand');
    const categoryFilters = selectedFilters.filter((f) => f.type === 'category');
    const descriptionFilter = selectedFilters.find((f) => f.type === 'description')?.value;
    const statusFilter = selectedFilters.find((f) => f.type === 'status')?.value;
    const barcodeFilter = selectedFilters.find((f) => f.type === 'barcode')?.value; // ✅ NOUVEAU

    // Filtre par statut de synchronisation WooCommerce
    if (wooFilter === 'woo_synced') {
      data = data.filter((p) => p.woo_id != null);
    } else if (wooFilter === 'woo_unsynced') {
      data = data.filter((p) => p.woo_id == null);
    }

    // Filtre par présence d'images et taille d'images
    if (imageFilter === 'has_image') {
      data = data.filter(
        (p) => p.image?.url || (Array.isArray(p.gallery_images) && p.gallery_images.length > 0)
      );
    } else if (imageFilter === 'no_image') {
      data = data.filter(
        (p) => !p.image?.url && (!Array.isArray(p.gallery_images) || p.gallery_images.length === 0)
      );
    } else if (imageFilter === 'small_image') {
      data = data.filter((p) => {
        // Vérifier l'image principale et les images de la galerie
        const mainImage = p.image;
        const galleryImages = p.gallery_images || [];
        const allImages = [mainImage, ...galleryImages].filter(Boolean);

        // S'il n'y a pas d'image, exclure ce produit
        if (allImages.length === 0) return false;

        // Chercher au moins une image trop petite
        return allImages.some((img) => {
          const width = img?.metadata?.dimensions?.width || 0;
          const height = img?.metadata?.dimensions?.height || 0;
          return width < 700 || height < 700;
        });
      });
    }

    // ✅ NOUVEAU - Filtre par code barre
    if (barcodeFilter) {
      data = data.filter((p) => {
        const barcode = extractBarcode(p);

        switch (barcodeFilter) {
          case 'has_barcode':
            return barcode !== '';
          case 'no_barcode':
            return barcode === '';
          case 'invalid_barcode':
            return barcode !== '' && !isValidBarcode(barcode);
          default:
            return true;
        }
      });
    }

    // Filtre par fournisseur
    if (supplierFilters.length > 0) {
      const supplierIds = supplierFilters.map((f) => f.value.replace('supplier_', ''));
      data = data.filter((p) => supplierIds.includes(p.supplier_id));
    }

    // Filtre par marque
    if (brandFilters.length > 0) {
      const brandIds = brandFilters.map((f) => f.value.replace('brand_', ''));
      data = data.filter((p) => brandIds.includes(p.brand_id));
    }

    // Filtrage amélioré pour les catégories hiérarchiques
    if (categoryFilters.length > 0) {
      const categoryIds = categoryFilters.map((f) => f.value);

      data = data.filter((product) => {
        // Vérifier chaque filtre de catégorie
        return categoryIds.some((categoryId) => {
          // ✅ NOUVEAU - Cas spécial "Sans catégorie"
          if (categoryId === 'no_category') {
            const hasNoMainCategory = !product.category_id || product.category_id === '';
            const hasNoCategories =
              !product.categories ||
              !Array.isArray(product.categories) ||
              product.categories.length === 0 ||
              product.categories.every((cat) => !cat || cat === '');
            const hasNoCategoryInfo =
              !product.category_info ||
              !product.category_info.refs ||
              product.category_info.refs.length === 0;

            return hasNoMainCategory && hasNoCategories && hasNoCategoryInfo;
          }

          // Cas normal - catégorie existante
          return !!product.category_info?.path_info?.[categoryId];
        });
      });
    }

    // Filtre par présence de description
    if (descriptionFilter === 'has_description') {
      data = data.filter((p) => p.description && p.description.trim() !== '');
    } else if (descriptionFilter === 'no_description') {
      data = data.filter((p) => !p.description || p.description.trim() === '');
    }

    // Filtrage par statut
    if (statusFilter) {
      const status = statusFilter.replace('status_', '');
      data = data.filter((p) => p.status === status);
    }

    return data;
  };

  return {
    selectedFilters,
    setSelectedFilters,
    filterOptions,
    filterProducts,
  };
};

export default useProductFilters;
