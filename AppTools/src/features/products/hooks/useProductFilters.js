// src/features/products/hooks/useProductFilters.js
import { useMemo } from 'react';
import { useEntityFilter } from '@/hooks/useEntityFilter';

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
      const categoryIds = categoryFilters.map((f) => f.value.replace('category_', ''));

      // Méthode simplifiée et optimisée pour vérifier l'appartenance à une catégorie
      const productBelongsToCategory = (product, categoryId) => {
        // Vérifier si le produit a un chemin enregistré pour cette catégorie
        // Ce qui signifie qu'il appartient à cette catégorie ou à l'une de ses sous-catégories
        return !!product.category_info?.path_info?.[categoryId];
      };

      // Filtrer les produits appartenant à l'une des catégories sélectionnées ou à leurs sous-catégories
      data = data.filter((product) =>
        categoryIds.some((categoryId) => productBelongsToCategory(product, categoryId))
      );
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
