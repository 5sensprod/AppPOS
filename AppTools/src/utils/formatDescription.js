export function formatDescriptionForDisplay(description) {
  if (!description) return '';

  let processed = description;

  // 1. Extraire et protéger les tableaux HTML
  const tableParts = [];
  const tableRegex = /(<table[\s\S]*?<\/table>)/g;
  let match;
  let index = 0;

  while ((match = tableRegex.exec(processed)) !== null) {
    const placeholder = `__TABLE_PLACEHOLDER_${index}__`;
    tableParts.push({
      placeholder,
      content: match[0],
    });
    processed = processed.replace(match[0], placeholder);
    index++;
  }

  // 2. Markdown / Mise en forme
  processed = processed.replace(/^\s*\d+\.\s*/gm, ''); // Numéros de liste
  processed = processed.replace(/^##\s+(.+)$/gm, '<h3 class="text-xl font-semibold mb-3">$1</h3>');
  processed = processed.replace(/^###\s+(.+)$/gm, '<h4 class="text-lg font-semibold mb-2">$1</h4>');
  processed = processed.replace(/^\s*\*\s+(.+)$/gm, '<li>$1</li>');
  processed = processed.replace(
    /(<li>.*?<\/li>)(?!\s*<\/ul>)/gs,
    '<ul class="list-disc pl-5 mb-4">$1</ul>'
  );
  processed = processed.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  processed = processed.replace(/(?<!\*)\*([^*]+)\*(?!\*)/g, '<em>$1</em>');

  // 3. Titres de section IA
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

  // 4. Paragraphes
  const paragraphRegex = /(?<=>|^)([^<]+)(?=<|$)/g;
  processed = processed.replace(paragraphRegex, (match, text) => {
    if (text.trim()) {
      const paragraphs = text.split(/\n\n+/).filter((p) => p.trim());
      return paragraphs.map((p) => `<p class="mb-4">${p.trim()}</p>`).join('');
    }
    return match;
  });

  // 5. Réintégrer les tableaux + styliser
  tableParts.forEach(({ placeholder, content }) => {
    let styledTable = content
      .replace(
        /<table>/g,
        '<table class="w-full border border-gray-300 dark:border-gray-700 border-collapse">'
      )
      .replace(
        /<th>/g,
        '<th class="bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white px-4 py-2 border border-gray-300 dark:border-gray-700">'
      )
      .replace(/<td>/g, '<td class="px-4 py-2 border border-gray-300 dark:border-gray-700">');

    processed = processed.replace(
      placeholder,
      `<div class="product-technical-table">${styledTable}</div>`
    );
  });

  // 6. Nettoyages finaux
  processed = processed.replace(/>\s+</g, '><'); // Remove empty spaces
  processed = processed.replace(/<p>\s*<\/p>/g, '');

  return processed;
}
