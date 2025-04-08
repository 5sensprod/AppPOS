// src/utils/formatDescription.js

/**
 * Formate et nettoie la description du produit pour l'affichage
 * @param {string} description - La description brute (HTML ou Markdown)
 * @returns {string} - Description formatée en HTML propre
 */
export const formatDescriptionForDisplay = (description) => {
  if (!description || typeof description !== 'string') {
    return '';
  }

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

  // Normaliser les titres - convertir h1/h2/h3 ou titres Markdown en structure cohérente
  // Si un <h1> existe, le conserver, sinon chercher ## ou # pour en créer un
  const titleMatch = processed.match(/<h1[^>]*>(.*?)<\/h1>/i) || processed.match(/^#\s+(.*)$/m);

  if (titleMatch) {
    // Si c'est un titre Markdown, le convertir en HTML
    if (titleMatch[0].startsWith('#')) {
      processed = processed.replace(/^#\s+(.*)$/m, '<h1 class="text-2xl font-bold mb-4">$1</h1>');
    }
  }

  // Convertir les titres markdown (## Titre) en HTML h2
  processed = processed.replace(/^##\s+(.+)$/gm, '<h2 class="text-xl font-semibold mb-3">$1</h2>');

  // Convertir les sous-titres markdown (### Titre) en HTML h3
  processed = processed.replace(/^###\s+(.+)$/gm, '<h3 class="text-lg font-semibold mb-2">$1</h3>');

  // 3. Normaliser les sections spécifiques de produit

  // Points Forts - gérer les différentes variantes possibles
  processed = processed.replace(
    /<h2[^>]*>Points Forts<\/h2>/i,
    '<h2 class="text-xl font-semibold mt-6 mb-3">Points Forts</h2>'
  );

  processed = processed.replace(
    /<strong>Points Forts :<\/strong>/g,
    '<h2 class="text-xl font-semibold mt-6 mb-3">Points Forts</h2>'
  );

  // Caractéristiques Techniques - uniformiser
  processed = processed.replace(
    /<h2[^>]*>Caractéristiques Techniques<\/h2>/i,
    '<h2 class="text-xl font-semibold mt-6 mb-3">Caractéristiques Techniques</h2>'
  );

  processed = processed.replace(
    /<strong>Fiche Technique :<\/strong>/g,
    '<h2 class="text-xl font-semibold mt-6 mb-3">Caractéristiques Techniques</h2>'
  );

  // Conseils d'utilisation - uniformiser
  processed = processed.replace(
    /<h2[^>]*>Conseils d'utilisation<\/h2>/i,
    '<h2 class="text-xl font-semibold mt-6 mb-3">Conseils d\'utilisation</h2>'
  );

  processed = processed.replace(
    /<strong>Conseils d'utilisation :<\/strong>/g,
    '<h2 class="text-xl font-semibold mt-6 mb-3">Conseils d\'utilisation</h2>'
  );

  // 4. Convertir les listes à puces en HTML standard

  // Premièrement, gérer les listes déjà en HTML mais sans styles
  if (!processed.includes('<ul class=')) {
    processed = processed.replace(
      /<ul>([\s\S]*?)<\/ul>/g,
      '<ul class="list-disc pl-5 mb-4">$1</ul>'
    );
  }

  // Ensuite, convertir les listes en Markdown
  processed = processed.replace(/^\s*[\*\-]\s+(.+)$/gm, '<li>$1</li>');

  // Entourer les groupes de <li> isolés avec <ul></ul>
  const liRegex = /(<li>.*?<\/li>)(?!\s*<\/ul>)/g;
  let liMatch;
  const liGroups = [];

  while ((liMatch = liRegex.exec(processed)) !== null) {
    if (!processed.substring(liMatch.index - 5, liMatch.index).includes('<ul')) {
      liGroups.push({
        start: liMatch.index,
        content: liMatch[0],
      });
    }
  }

  // Appliquer les remplacements en commençant par la fin pour ne pas perturber les indices
  for (let i = liGroups.length - 1; i >= 0; i--) {
    const group = liGroups[i];
    processed =
      processed.substring(0, group.start) +
      `<ul class="list-disc pl-5 mb-4">${group.content}</ul>` +
      processed.substring(group.start + group.content.length);
  }

  // 5. Formatage général du texte

  // Convertir les doubles astérisques en balises strong (**texte**)
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convertir les simples astérisques en balises em (*texte*)
  processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // 6. Réintégrer les tableaux HTML avec style WooCommerce
  tableParts.forEach((part) => {
    processed = processed.replace(part.placeholder, part.content);
  });

  // 7. S'assurer que les tableaux ont un style similaire à WooCommerce (marges réduites)
  processed = processed.replace(
    /<table[^>]*>/g,
    '<table class="w-full border-collapse mb-4" style="border-spacing: 0;">'
  );

  processed = processed.replace(
    /<tr>\s*<th/g,
    '<tr class="bg-gray-100 dark:bg-gray-700"><th class="border border-gray-300 dark:border-gray-600 p-2 text-left"'
  );

  // Réduire les marges des cellules de tableau pour correspondre à WooCommerce
  processed = processed.replace(
    /<tr>\s*<td/g,
    '<tr class="border-b border-gray-200 dark:border-gray-700"><td class="border border-gray-300 dark:border-gray-600 p-2" style="padding: 6px 10px;"'
  );

  // Remplacer les styles padding existants dans les cellules
  processed = processed.replace(/padding: 10px;/g, 'padding: 6px 10px;');

  // 8. Envelopper les paragraphes de texte brut
  const paragraphRegex = /(?<=>|^)([^<]+)(?=<|$)/g;
  processed = processed.replace(paragraphRegex, (match, textContent) => {
    if (textContent.trim()) {
      // Diviser par les sauts de ligne et créer des paragraphes
      const paragraphs = textContent.split(/\n\n+/).filter((p) => p.trim());
      return paragraphs.map((p) => `<p class="mb-4">${p.trim()}</p>`).join('');
    }
    return match;
  });

  // 9. Nettoyer les espaces et balises vides
  processed = processed.replace(/>\s+</g, '><');
  processed = processed.replace(/<p>\s*<\/p>/g, '');

  return processed;
};

/**
 * Nettoie le texte HTML généré par l'IA pour enlever les balises de code ou instructions
 * @param {string} content - Contenu généré par l'IA
 * @returns {string} - Contenu nettoyé
 */
export const cleanAIGeneratedContent = (content) => {
  if (!content) return '';

  return content
    .replace(/```html/g, '')
    .replace(/```/g, '')
    .trim();
};
