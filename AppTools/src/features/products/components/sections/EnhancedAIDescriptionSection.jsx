// src/features/products/components/sections/EnhancedAIDescriptionSection.jsx
import React, { useState, useEffect } from 'react';
import { Loader2, Image, Upload } from 'lucide-react';
import apiService from '../../../../services/api';
import imageProxyService from '../../../../services/imageProxyService';

const EnhancedAIDescriptionSection = ({ product, editable, register, setValue, watch }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [customImage, setCustomImage] = useState(null);
  const [customImagePreview, setCustomImagePreview] = useState(null);
  const [formattedDescription, setFormattedDescription] = useState({
    title: '',
    intro: '',
    highlights: [],
    technicalTable: '',
    usage: '',
  });

  // Reset le message de succès après 3 secondes
  useEffect(() => {
    let timer;
    if (success) {
      timer = setTimeout(() => {
        setSuccess(false);
      }, 3000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [success]);

  // Formater la description générée
  useEffect(() => {
    if (generatedDescription) {
      // Analyser et formater la description
      const formatted = parseGeneratedDescription(generatedDescription);
      setFormattedDescription(formatted);
    }
  }, [generatedDescription]);

  // Fonction pour analyser et formater la description générée
  const parseGeneratedDescription = (rawDescription) => {
    const result = {
      title: '',
      intro: '',
      highlights: [],
      technicalTable: '',
      usage: '',
    };

    // Extraire le titre s'il existe
    const titleMatch = rawDescription.match(/^##?\s+([^\n]+)/);
    if (titleMatch && titleMatch[1]) {
      result.title = titleMatch[1].trim();
    }

    // Extraire la section du tableau technique (préserver intact)
    const tableMatch = rawDescription.match(/<table>[\s\S]*?<\/table>/);
    if (tableMatch) {
      result.technicalTable = tableMatch[0];
    }

    // Extraire l'introduction (entre le titre et les points forts)
    let introSection = '';
    const sections = rawDescription.split(/\*\*Points Forts:\*\*/);
    if (sections.length > 0) {
      introSection = sections[0];
      // Retirer le titre du début s'il existe
      if (titleMatch) {
        introSection = introSection.replace(/^##?\s+[^\n]+\s*\n+/, '');
      }
      result.intro = introSection.trim();
    }

    // Extraire les points forts
    const highlightsMatch = rawDescription.match(
      /\*\*Points Forts:\*\*\s*\n\n([\s\S]*?)(?=\n\n\*\*)/
    );
    if (highlightsMatch && highlightsMatch[1]) {
      result.highlights = highlightsMatch[1]
        .split('\n')
        .filter((item) => item.trim().startsWith('*'))
        .map((item) => item.replace(/^\*\s*/, '').trim());
    }

    // Extraire les conseils d'utilisation
    const usageMatch = rawDescription.match(
      /\*\*Conseils d'utilisation:\*\*\s*\n\n([\s\S]*?)(?=$)/
    );
    if (usageMatch && usageMatch[1]) {
      result.usage = usageMatch[1].trim();
    }

    return result;
  };

  // Gérer le téléchargement d'une image personnalisée
  const handleCustomImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Vérifier le type et la taille du fichier
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSize = 5 * 1024 * 1024; // 5Mo

    if (!acceptedTypes.includes(file.type)) {
      setError("Format d'image non supporté. Utilisez JPG, PNG ou WEBP.");
      return;
    }

    if (file.size > maxSize) {
      setError('Image trop volumineuse. Maximum 5Mo.');
      return;
    }

    setCustomImage(file);

    // Créer un aperçu de l'image
    const reader = new FileReader();
    reader.onload = (e) => {
      setCustomImagePreview(e.target.result);
    };
    reader.readAsDataURL(file);

    // Effacer les erreurs précédentes
    setError(null);
  };

  // Supprimer l'image personnalisée
  const removeCustomImage = () => {
    setCustomImage(null);
    setCustomImagePreview(null);
  };

  const generateDescription = async () => {
    if (loading) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Vérifier que le produit a un nom
      if (!product?.name) {
        setError('Le produit doit avoir un nom pour générer une description');
        setLoading(false);
        return;
      }

      // Préparer les données à envoyer
      const formData = new FormData();
      formData.append('name', product.name);

      // Ajouter les informations optionnelles si disponibles
      if (product?.category_info?.primary?.name) {
        formData.append('category', product.category_info.primary.name);
      }

      if (product?.brand_ref?.name) {
        formData.append('brand', product.brand_ref.name);
      }

      if (product?.price) {
        formData.append('price', product.price.toString());
      }

      // Ajouter les spécifications si disponibles
      if (product?.specifications) {
        try {
          formData.append('specifications', JSON.stringify(product.specifications));
        } catch (specErr) {
          console.warn('Erreur lors de la sérialisation des spécifications:', specErr);
        }
      }

      // Priorité à l'image personnalisée si elle existe
      if (customImage) {
        formData.append('image', customImage);
      } else if (product?.image?.url) {
        // Sinon, utiliser l'image principale du produit si disponible
        try {
          const response = await fetch(product.image.url);
          if (response.ok) {
            const blob = await response.blob();
            formData.append('image', new File([blob], 'product-image.jpg', { type: 'image/jpeg' }));
          }
        } catch (imageErr) {
          console.warn("Impossible de récupérer l'image du produit:", imageErr);
          // Continuons sans image plutôt que d'échouer complètement
        }
      }

      // Appel à l'API pour générer la description
      const response = await apiService.post('/api/descriptions/generate', formData);

      // Récupérer la description générée en tenant compte de la structure de réponse
      const generatedDesc = response.data.data?.description || response.data.description;

      if (!generatedDesc) {
        throw new Error("La réponse de l'API ne contient pas de description");
      }

      // Stocker la description générée
      setGeneratedDescription(generatedDesc);

      // S'assurer que setValue existe avant de l'appeler
      if (setValue && typeof setValue === 'function') {
        try {
          setValue('description', generatedDesc, { shouldValidate: true, shouldDirty: true });
          setSuccess(true);
        } catch (setValueErr) {
          console.error('Erreur lors de la mise à jour de la description:', setValueErr);
          setError('Erreur lors de la mise à jour du formulaire.');
        }
      } else {
        setSuccess(true);
      }
    } catch (error) {
      console.error('Erreur lors de la génération de la description:', error);
      setError(error.response?.data?.message || 'Erreur lors de la génération de la description');
    } finally {
      setLoading(false);
    }
  };

  if (!editable) {
    return null; // Ne rien afficher en mode lecture
  }

  return (
    <div className="mb-6 ">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Description du produit
        </h3>
        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={generateDescription}
            disabled={loading}
            className="inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-4 w-4" />
                Génération en cours...
              </>
            ) : (
              'Générer avec IA'
            )}
          </button>
        </div>
      </div>

      {/* Section pour l'image personnalisée */}
      <div className="mb-4 mt-2 border border-gray-200 dark:border-gray-700 rounded-md p-4 bg-gray-50 dark:bg-gray-800">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <Image size={16} className="mr-1" />
            <span>Image pour générer la description</span>
          </div>

          <div className="flex space-x-2">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCustomImageUpload}
                className="hidden"
              />
              <div className="flex items-center px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition">
                <Upload size={12} className="mr-1" />
                Choisir une image
              </div>
            </label>

            {customImagePreview && (
              <button
                onClick={removeCustomImage}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 text-red-600 dark:text-red-400 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Supprimer
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center">
          {customImagePreview ? (
            <div className="flex flex-col items-center mr-4">
              <img
                src={customImagePreview}
                alt="Image personnalisée"
                className="h-16 w-16 object-cover rounded border"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">Personnalisée</span>
            </div>
          ) : null}

          {product?.image?.url && !customImagePreview ? (
            <div className="flex flex-col items-center mr-4">
              <img
                src={imageProxyService.getImageUrl(product.image.url)}
                alt="Image principale"
                className="h-16 w-16 object-cover rounded border"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Image principale
              </span>
            </div>
          ) : !customImagePreview ? (
            <div className="text-sm text-gray-500 dark:text-gray-400 italic">
              Aucune image disponible. Ajoutez une image pour améliorer la qualité de la
              description.
            </div>
          ) : null}
        </div>
      </div>

      {register && (
        <textarea
          {...register('description')}
          rows={8}
          className="w-full px-3 py-2 border dark:bg-gray-700 dark:border-gray-600 dark:text-white rounded-md"
          placeholder="Description du produit..."
        />
      )}

      {error && <p className="mt-1 text-sm text-red-600 dark:text-red-500">{error}</p>}

      {success && (
        <p className="mt-1 text-sm text-green-600 dark:text-green-500">
          Description générée avec succès!
        </p>
      )}

      {/* Affichage formaté de la description générée */}
      {generatedDescription && (
        <div className="mt-4 border border-gray-200 dark:border-gray-700 rounded-md">
          {/* En-tête de l'aperçu */}
          <div className="flex items-center justify-between p-3 bg-gray-100 dark:bg-gray-800 rounded-t-md">
            <h4 className="font-medium text-gray-800 dark:text-gray-200">
              Aperçu de la description générée
            </h4>
            <button
              type="button"
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700"
              onClick={() => {
                if (setValue) {
                  setValue('description', generatedDescription, {
                    shouldValidate: true,
                    shouldDirty: true,
                  });
                  setSuccess(true);
                }
              }}
            >
              Appliquer cette description
            </button>
          </div>

          {/* Contenu de l'aperçu */}
          <div className="p-4 bg-white dark:bg-gray-900 rounded-b-md">
            <div className="prose dark:prose-invert max-w-none text-sm overflow-y-auto max-h-96">
              {/* Titre du produit */}
              {formattedDescription.title && (
                <h3 className="text-lg font-medium mb-3 text-gray-900 dark:text-gray-100">
                  {formattedDescription.title}
                </h3>
              )}

              {/* Introduction - Version concise */}
              {formattedDescription.intro && (
                <div className="mb-4">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {formattedDescription.intro}
                  </p>
                </div>
              )}

              {/* Points forts - Affichage compact */}
              {formattedDescription.highlights.length > 0 && (
                <div className="mb-4">
                  <h5 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    Points Forts:
                  </h5>
                  <ul className="list-disc pl-5 grid grid-cols-2 gap-1">
                    {formattedDescription.highlights.map((highlight, idx) => (
                      <li key={idx} className="text-sm text-gray-700 dark:text-gray-300">
                        {highlight}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tableau technique - Conservé intégralement */}
              {formattedDescription.technicalTable && (
                <div className="mb-4 overflow-x-auto product-technical-table">
                  <h5 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    Fiche Technique:
                  </h5>
                  <div
                    className="w-full"
                    dangerouslySetInnerHTML={{ __html: formattedDescription.technicalTable }}
                  />
                </div>
              )}

              {/* Conseils d'utilisation - Version concise */}
              {formattedDescription.usage && (
                <div className="mb-1">
                  <h5 className="font-medium mb-2 text-gray-800 dark:text-gray-200">
                    Conseils d'utilisation:
                  </h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {formattedDescription.usage}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Cliquez sur "Générer avec IA" pour créer automatiquement une description commerciale basée
        sur les informations du produit et son image.
      </p>
    </div>
  );
};

export default EnhancedAIDescriptionSection;
