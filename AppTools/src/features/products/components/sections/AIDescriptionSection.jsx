// src/features/products/components/sections/AIDescriptionSection.jsx
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import apiService from '../../../../services/api';

const AIDescriptionSection = ({ product, editable, register, setValue, watch }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [formattedDescription, setFormattedDescription] = useState({
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
      intro: '',
      highlights: [],
      technicalTable: '',
      usage: '',
    };

    // Extraire la section du tableau technique (préserver intact)
    const tableMatch = rawDescription.match(/<table>[\s\S]*?<\/table>/);
    if (tableMatch) {
      result.technicalTable = tableMatch[0];
    }

    // Extraire l'introduction (paragraphes avant les points forts)
    const introMatch = rawDescription.split(/\*\*Points Forts:\*\*/)[0];
    if (introMatch) {
      result.intro = introMatch.replace(/^#+\s+[^]+?\n\n/, '').trim(); // Enlever le titre
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

      // Ajouter l'image si disponible (optionnel)
      if (product?.image?.url) {
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
    <div className="mb-6 mt-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">
          Description du produit
        </h3>
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
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-medium text-blue-800 dark:text-blue-300">
              Aperçu de la description générée:
            </h4>
            <button
              type="button"
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded"
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

          {/* Version formatée pour l'aperçu */}
          <div className="prose dark:prose-invert max-w-none text-sm overflow-y-auto max-h-96">
            {/* Introduction - Version concise */}
            {formattedDescription.intro && (
              <div className="mb-4">
                <p>{formattedDescription.intro}</p>
              </div>
            )}

            {/* Points forts - Affichage compact */}
            {formattedDescription.highlights.length > 0 && (
              <div className="mb-4">
                <h5 className="font-medium mb-1">Points Forts:</h5>
                <ul className="list-disc pl-5 grid grid-cols-2 gap-1">
                  {formattedDescription.highlights.map((highlight, idx) => (
                    <li key={idx} className="text-sm">
                      {highlight}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tableau technique - Conservé intégralement */}
            {formattedDescription.technicalTable && (
              <div className="mb-4 overflow-x-auto">
                <h5 className="font-medium mb-1">Fiche Technique:</h5>
                <div
                  className="w-full"
                  dangerouslySetInnerHTML={{ __html: formattedDescription.technicalTable }}
                />
              </div>
            )}

            {/* Conseils d'utilisation - Version concise */}
            {formattedDescription.usage && (
              <div className="mb-2">
                <h5 className="font-medium mb-1">Conseils d'utilisation:</h5>
                <p className="text-sm">{formattedDescription.usage}</p>
              </div>
            )}
          </div>

          {/* Version brute cachée pour le développement */}
          {/* <details className="mt-4">
            <summary className="text-xs text-gray-500 cursor-pointer">Voir HTML brut</summary>
            <pre className="text-xs mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-40">
              {generatedDescription}
            </pre>
          </details> */}
        </div>
      )}

      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
        Cliquez sur "Générer avec IA" pour créer automatiquement une description commerciale basée
        sur les informations du produit et son image.
      </p>
    </div>
  );
};

export default AIDescriptionSection;
