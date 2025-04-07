// src/features/products/components/sections/ProductDescriptionDisplay.jsx
import React, { useEffect, useState } from 'react';

/**
 * Composant pour afficher la description du produit en mode lecture
 * Avec conversion des symboles Markdown et formatage correct
 */
const ProductDescriptionDisplay = ({ description }) => {
  const [formattedDescription, setFormattedDescription] = useState('');

  // Vérifier si la description est vide
  if (!description) {
    return (
      <div className="mb-6 mt-4">
        <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
          Description du produit
        </h3>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border dark:border-gray-700">
          <p className="text-gray-500 dark:text-gray-400 italic">Aucune description disponible</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    if (description) {
      // Traiter la description pour nettoyer le formatage Markdown
      let processed = description;

      // 1. Extraire les tableaux HTML pour les préserver
      const tableParts = [];
      const tableRegex = /(<table[\s\S]*?<\/table>)/g;
      let tableMatch;
      let tableIndex = 0;

      while ((tableMatch = tableRegex.exec(processed)) !== null) {
        tableParts.push({
          placeholder: `__TABLE_PLACEHOLDER_${tableIndex}__`,
          content: `<div class="product-technical-table">${tableMatch[0]}</div>`,
        });
        tableIndex++;
      }

      // Remplacer les tableaux par des placeholders
      tableParts.forEach((part) => {
        processed = processed.replace(/<table[\s\S]*?<\/table>/, part.placeholder);
      });

      // 2. Nettoyer les signes Markdown
      // Supprimer les numéros au début des lignes (1., 2., etc.)
      processed = processed.replace(/^\s*\d+\.\s*/gm, '');

      // Convertir les titres markdown (## Titre) en HTML
      processed = processed.replace(
        /^##\s+(.+)$/gm,
        '<h3 class="text-xl font-semibold mb-3">$1</h3>'
      );

      // Convertir les sous-titres markdown (### Titre) en HTML
      processed = processed.replace(
        /^###\s+(.+)$/gm,
        '<h4 class="text-lg font-semibold mb-2">$1</h4>'
      );

      // Convertir les listes à puces (* Item) en HTML
      processed = processed.replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>');

      // Entourer les groupes de <li> avec <ul></ul>
      processed = processed.replace(
        /(<li>.*?<\/li>)\s*(?=<li>|$)/gs,
        '<ul class="list-disc pl-5 mb-4">$1</ul>'
      );

      // Convertir les doubles astérisques en balises strong (**texte**)
      processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

      // Convertir les simples astérisques en balises em (*texte*)
      processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

      // Convertir les blocs de "Points Forts" et "Conseils d'utilisation"
      processed = processed.replace(
        /<strong>Points Forts :<\/strong>/g,
        '<h4 class="text-lg font-semibold mt-4 mb-2">Points Forts :</h4>'
      );

      processed = processed.replace(
        /<strong>Conseils d'utilisation :<\/strong>/g,
        '<h4 class="text-lg font-semibold mt-4 mb-2">Conseils d\'utilisation :</h4>'
      );

      processed = processed.replace(
        /<strong>Fiche Technique :<\/strong>/g,
        '<h4 class="text-lg font-semibold mt-4 mb-2">Fiche Technique :</h4>'
      );

      // 3. Réintégrer les tableaux HTML
      tableParts.forEach((part) => {
        processed = processed.replace(part.placeholder, part.content);
      });

      // 4. Convertir les sauts de ligne en balises <p>
      // Trouver les blocs de texte (entre les balises HTML) et les envelopper avec <p>
      const paragraphRegex = /(?<=>|^)([^<]+)(?=<|$)/g;
      processed = processed.replace(paragraphRegex, (match, textContent) => {
        if (textContent.trim()) {
          // Diviser par les sauts de ligne et créer des paragraphes
          const paragraphs = textContent.split(/\n\n+/).filter((p) => p.trim());
          return paragraphs.map((p) => `<p class="mb-4">${p.trim()}</p>`).join('');
        }
        return match;
      });

      // 5. Nettoyer les espaces et balises vides
      processed = processed.replace(/>\s+</g, '><');
      processed = processed.replace(/<p>\s*<\/p>/g, '');

      setFormattedDescription(processed);
    }
  }, [description]);

  return (
    <div className="mb-6 mt-4 product-description">
      <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
        Description du produit
      </h3>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border dark:border-gray-700">
        <div className="prose dark:prose-invert max-w-none">
          <div dangerouslySetInnerHTML={{ __html: formattedDescription }} />
        </div>
      </div>
    </div>
  );
};

export default ProductDescriptionDisplay;
