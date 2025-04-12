// src/features/common/tabs/WooCommerceTab.jsx
import React, { useEffect, useState } from 'react';
import { CheckCircle, AlertCircle, Wand2, XCircle } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import apiService from '../../../services/api';

const WooCommerceTab = ({ entity, entityType, onSync, editable = false, showStatus = false }) => {
  // Récupération du contexte du formulaire si en mode édition
  const formContext = editable ? useFormContext() : null;
  const register = formContext?.register;
  const errors = formContext?.formState?.errors;
  const watch = formContext?.watch;
  const setValue = formContext?.setValue;
  const getValues = formContext?.getValues;

  // États pour la génération de titre
  const [isTitleGenerating, setIsTitleGenerating] = useState(false);
  const [titleError, setTitleError] = useState(null);

  // Nouvel état pour vérifier si la synchronisation est possible
  const [syncValidation, setSyncValidation] = useState({
    hasImages: !!entity?.gallery_images?.length,
    hasDescription: !!entity?.description,
    hasCategory: !!entity?.category_info?.primary?.id,
    isValid: !!(
      entity?.gallery_images?.length &&
      entity?.description &&
      entity?.category_info?.primary?.id
    ),
  });

  // Mise à jour de l'état de validation lorsque l'entité change
  useEffect(() => {
    const hasImages = !!entity?.gallery_images?.length;
    const hasDescription = !!entity?.description;
    const hasCategory = !!entity?.category_info?.primary?.id;

    setSyncValidation({
      hasImages,
      hasDescription,
      hasCategory,
      isValid: hasImages && hasDescription && hasCategory,
    });
  }, [entity]);

  const generateSlugFromText = (text) => {
    if (!text) return '';

    return text
      .toString()
      .toLowerCase()
      .normalize('NFD') // Normaliser les caractères accentués
      .replace(/[\u0300-\u036f]/g, '') // Supprimer les accents
      .replace(/[^\w\s-]/g, '') // Supprimer les caractères spéciaux
      .replace(/\s+/g, '-') // Remplacer les espaces par des tirets
      .replace(/--+/g, '-') // Supprimer les tirets multiples
      .trim(); // Supprimer les espaces au début et à la fin
  };

  // Fonction pour mettre à jour le slug
  const updateSlug = (value) => {
    if (value && setValue) {
      // Création du texte pour le slug
      let slugParts = [value]; // 1. Ajout du name (obligatoire)

      // 2. Ajout du SKU s'il est présent, sinon ajout de la désignation
      const sku = entity?.sku || getValues?.('sku');
      if (sku) {
        slugParts.push(sku);
      } else {
        // 3. Ajout de la désignation uniquement si pas de SKU
        const designation = entity?.designation;
        if (designation) {
          slugParts.push(designation);
        }
      }

      // Jointure des parties et génération du slug
      const combinedText = slugParts.join(' ');
      const slug = generateSlugFromText(combinedText);

      setValue('slug', slug, { shouldDirty: true, shouldTouch: true });
    }
  };
  // Effet pour initialiser le slug et suivre les changements
  useEffect(() => {
    if (editable && setValue && watch && getValues) {
      // Force l'écrasement du slug initial avec une valeur basée sur le name actuel
      const currentName = getValues('name');
      if (currentName) {
        updateSlug(currentName);
      }

      // Observer les changements sur le champ name
      const subscription = watch((values, { name: fieldName }) => {
        if (fieldName === 'name') {
          updateSlug(values.name);
        }
      });

      return () => subscription.unsubscribe();
    }
  }, [editable, setValue, watch, getValues]);

  // Fonction pour générer un titre avec l'IA
  const generateTitle = async () => {
    if (!editable || isTitleGenerating) return;

    setIsTitleGenerating(true);
    setTitleError(null);

    try {
      // Log des données disponibles
      console.log('Données produit pour génération de titre:', {
        name: getValues('name') || '',
        category: entity.category_info?.primary?.name || '',
        brand: entity.brand_ref?.name || '',
        sku: entity.sku || getValues('sku') || '',
        price: entity.price || '',
        hasDescription: !!entity.description,
        hasSpecs: !!entity.specifications && Object.keys(entity.specifications).length > 0,
      });

      // Rassembler les données du produit pour l'API
      const formData = new FormData();

      // Ajouter les informations du produit
      formData.append('name', getValues('name') || '');
      formData.append('category', entity.category_info?.primary?.name || '');
      formData.append('brand', entity.brand_ref?.name || '');
      formData.append('sku', entity.sku || getValues('sku') || '');
      formData.append('price', entity.price || '');

      // Ajouter la description si disponible
      if (entity.description) {
        formData.append('currentDescription', entity.description);
      }

      // Ajouter les spécifications si disponibles
      if (entity.specifications && Object.keys(entity.specifications).length > 0) {
        formData.append('specifications', JSON.stringify(entity.specifications));
      }

      // Appel à l'API pour générer le titre
      console.log("Appel de l'API de génération de titre...");
      const response = await apiService.post('/api/product-title/generate', formData);
      console.log("Réponse de l'API:", response.data);

      if (response.data.success && response.data.data.title) {
        // Appliquer le titre généré
        setValue('name', response.data.data.title, {
          shouldValidate: true,
          shouldDirty: true,
        });

        // Mettre à jour le slug automatiquement
        updateSlug(response.data.data.title);
      } else {
        setTitleError(`Erreur: ${response.data.message || 'Réponse invalide du serveur'}`);
      }
    } catch (error) {
      console.error('Erreur détaillée lors de la génération du titre:', error);
      if (error.response) {
        console.error("Réponse d'erreur du serveur:", error.response.data);
        setTitleError(
          `Erreur serveur: ${error.response.data.message || error.response.statusText}`
        );
      } else if (error.request) {
        console.error('Pas de réponse reçue:', error.request);
        setTitleError('Pas de réponse du serveur');
      } else {
        console.error('Erreur de configuration:', error.message);
        setTitleError(`Erreur: ${error.message}`);
      }
    } finally {
      setIsTitleGenerating(false);
    }
  };

  // Options pour le champ statut
  const statusOptions = [
    { value: 'published', label: 'Publié' },
    { value: 'draft', label: 'Brouillon' },
    { value: 'archived', label: 'Archivé' },
  ];

  // Fonction pour obtenir le texte approprié selon le type d'entité
  const getEntityTypeText = () => {
    const types = {
      product: 'Produit',
      category: 'Catégorie',
      brand: 'Marque',
      supplier: 'Fournisseur',
    };

    return types[entityType] || 'Élément';
  };

  // Déterminer si on doit afficher le statut selon le type d'entité
  // Par défaut, on affiche uniquement pour les produits, sauf si showStatus est explicitement à true
  const shouldShowStatus = showStatus || entityType === 'product';

  // Rendu du statut en mode lecture seule
  const renderStatusField = (status) => {
    const statusClasses = {
      published: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      draft: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      archived: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      default: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    const statusText = {
      published: 'Publié',
      draft: 'Brouillon',
      archived: 'Archivé',
      default: 'Inconnu',
    };

    return (
      <span
        className={`px-2 py-1 rounded-full text-xs font-medium ${
          statusClasses[status] || statusClasses.default
        }`}
      >
        {statusText[status] || statusText.default}
      </span>
    );
  };

  // Fonction pour gérer la synchronisation avec vérification préalable
  const handleSync = (id) => {
    if (!syncValidation.isValid) {
      // Si la synchronisation n'est pas valide, ne rien faire
      return;
    }

    // Appeler la fonction de synchronisation normale
    if (onSync) {
      onSync(id);
    }
  };

  return (
    <div className="space-y-6">
      {/* Section des informations WooCommerce */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Informations WooCommerce
        </h2>

        {/* Champ Titre pour le name avec bouton de génération */}
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
            Titre (pour WooCommerce)
          </h3>

          {editable ? (
            <div>
              <div className="flex">
                <input
                  type="text"
                  {...register('name', {
                    onChange: (e) => {
                      // Mettre à jour explicitement le slug à chaque frappe
                      updateSlug(e.target.value);
                    },
                  })}
                  placeholder="Titre sur la boutique en ligne"
                  className="w-full px-3 py-2 border border-gray-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                />
                {/* Bouton de génération de titre */}
                <button
                  type="button"
                  onClick={generateTitle}
                  disabled={isTitleGenerating}
                  className="flex items-center justify-center px-3 py-2 border border-l-0 border-gray-300 rounded-r-md bg-gray-50 text-gray-700 hover:bg-gray-100 dark:bg-gray-600 dark:border-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
                  title="Générer un titre avec l'IA"
                >
                  {isTitleGenerating ? (
                    <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                  ) : (
                    <Wand2 size={18} />
                  )}
                </button>
              </div>

              {titleError && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">{titleError}</p>
              )}

              {errors && errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-500">{errors.name.message}</p>
              )}
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                Le titre sera utilisé pour l'URL du produit sur la boutique en ligne
                {entityType === 'product' &&
                  '. Cliquez sur la baguette magique pour générer automatiquement un titre commercial.'}
              </p>
            </div>
          ) : (
            <div className="mt-1 text-gray-900 dark:text-gray-100">
              {entity.name || 'Pas de titre défini'}
            </div>
          )}
        </div>

        {/* Champ slug caché - uniquement en mode édition */}
        {editable && <input type="hidden" {...register('slug')} />}
      </div>

      {/* Section du statut de publication - conditionnel */}
      {shouldShowStatus && (
        <div>
          <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Statut de publication
          </h2>

          <div className="mb-4">
            <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Statut</h3>

            {editable ? (
              <div>
                <select
                  {...register('status')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {errors && errors.status && (
                  <p className="mt-1 text-sm text-red-600 dark:text-red-500">
                    {errors.status.message}
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-1 text-gray-900 dark:text-gray-100">
                {renderStatusField(entity.status)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Section du statut de synchronisation */}
      <div>
        <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
          Statut de synchronisation
        </h2>

        {/* Nouvelle section d'avertissement pour la synchronisation */}
        {!syncValidation.isValid && (
          <div className="bg-red-50 dark:bg-red-900 p-4 rounded-lg mb-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 mt-0.5">
                <XCircle className="h-5 w-5 text-red-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Synchronisation impossible
                </h3>
                <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                  <p>
                    Pour pouvoir synchroniser ce {getEntityTypeText().toLowerCase()} avec
                    WooCommerce, il est nécessaire de :
                  </p>
                  <ul className="list-disc pl-5 mt-1 space-y-1">
                    {!syncValidation.hasImages && <li>Ajouter au moins une image</li>}
                    {!syncValidation.hasDescription && <li>Ajouter une description</li>}
                    {!syncValidation.hasCategory && <li>Sélectionner une catégorie principale</li>}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {entity.woo_id ? (
          <div className="bg-green-50 dark:bg-green-900 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <CheckCircle className="h-5 w-5 text-green-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800 dark:text-green-200">
                  {getEntityTypeText()} synchronisé(e) avec la boutique en ligne
                </h3>
                <div className="mt-2 text-sm text-green-700 dark:text-green-300">
                  <p>ID Internet : {entity.woo_id}</p>
                  {entity.website_url && (
                    <p className="text-sm text-green-700 dark:text-green-300">
                      Url :{' '}
                      <a
                        href={entity.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 duration-200 ease-in-out"
                      >
                        {entity.website_url}
                      </a>
                    </p>
                  )}
                  {entity.last_sync && (
                    <p>Dernière synchronisation : {new Date(entity.last_sync).toLocaleString()}</p>
                  )}
                  {entity.pending_sync && (
                    <div className="mt-2">
                      <p className="text-yellow-600 dark:text-yellow-300">
                        Des modifications locales sont en attente de synchronisation
                      </p>
                      {onSync && (
                        <button
                          onClick={() => handleSync(entity.id)}
                          disabled={!syncValidation.isValid}
                          className={`mt-2 px-3 py-1 text-xs font-medium rounded-md ${
                            syncValidation.isValid
                              ? 'bg-blue-100 text-blue-800 hover:bg-blue-200 dark:bg-blue-800 dark:text-blue-100 dark:hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400'
                          }`}
                        >
                          Synchroniser les modifications
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-50 dark:bg-yellow-900 p-4 rounded-lg">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-yellow-400" />
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                  {getEntityTypeText()} non synchronisé(e)
                </h3>
                <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                  <p>Cet élément n'a pas encore été synchronisé avec WooCommerce.</p>
                  {onSync && (
                    <button
                      onClick={() => handleSync(entity.id)}
                      disabled={!syncValidation.isValid}
                      className={`mt-2 px-3 py-1 text-xs font-medium rounded-md ${
                        syncValidation.isValid
                          ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 dark:bg-yellow-800 dark:text-yellow-100 dark:hover:bg-yellow-700'
                          : 'bg-gray-100 text-gray-500 cursor-not-allowed dark:bg-gray-800 dark:text-gray-400'
                      }`}
                    >
                      Synchroniser maintenant
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {entity.website && (
        <div className="mt-4">
          <a
            href={entity.website}
            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
          >
            Voir l'élément sur la boutique en ligne
          </a>
        </div>
      )}
    </div>
  );
};

export default WooCommerceTab;
