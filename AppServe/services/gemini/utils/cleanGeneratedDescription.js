// services/gemini/utils/cleanGeneratedDescription.js

/**
 * Nettoie la description générée par l'IA pour supprimer les symboles Markdown
 * et s'assurer que le HTML est correctement formaté pour WooCommerce
 * @param {string} description La description brute générée par l'IA
 * @returns {string} La description nettoyée
 */
function cleanGeneratedDescription(description) {
  if (!description) return '';

  let cleaned = description;

  // 1. Supprimer tous les blocs de code markdown complètement
  cleaned = cleaned.replace(/```[a-z]*\s*([\s\S]*?)```/g, '$1');

  // 2. Extraire uniquement le contenu du body si structure HTML complète
  if (cleaned.includes('<!DOCTYPE html>') || cleaned.includes('<html')) {
    const bodyMatch = cleaned.match(/<body>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      cleaned = bodyMatch[1].trim();
    }
  }

  // 3. Nettoyer les numéros de section et les explications
  cleaned = cleaned.replace(/^\s*\d+\.\s*/gm, '');

  // 4. Supprimer les lignes qui sont des instructions ou des commentaires
  cleaned = cleaned.replace(/^(Voici|Voilà|Ici|J'ai créé|J'ai généré|Voici le code HTML).*$/gm, '');
  cleaned = cleaned.replace(/^(Note|Important|Remarque):.*$/gm, '');

  // 5. Protéger les attributs style avant conversions Markdown
  const styleMatches = [];
  let counter = 0;
  cleaned = cleaned.replace(
    /<([a-z0-9]+)([^>]*?style="[^"]*")([^>]*)>/gi,
    (match, tag, styleAttr, rest) => {
      const placeholder = `__STYLE_PLACEHOLDER_${counter}__`;
      styleMatches[counter] = { tag, styleAttr, rest };
      counter++;
      return placeholder;
    }
  );

  // 6. Convertir le format Markdown pour les points forts et autres sections
  cleaned = cleaned.replace(/\*\*([^*]+):\*\*/g, '<strong>$1:</strong>');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 7. Restaurer les balises avec attributs style
  for (let i = 0; i < styleMatches.length; i++) {
    const { tag, styleAttr, rest } = styleMatches[i];
    const placeholder = `__STYLE_PLACEHOLDER_${i}__`;
    cleaned = cleaned.replace(placeholder, `<${tag}${styleAttr}${rest}>`);
  }

  // 8. Remplacer les listes à puces Markdown par du HTML si non déjà formaté
  if (!cleaned.includes('<ul style=')) {
    cleaned = cleaned.replace(
      /^\s*-\s+(.+)$/gm,
      '<li style="margin: 0 0 8px 0; padding: 0;">$1</li>'
    );
    cleaned = cleaned.replace(
      /^\s*\*\s+(.+)$/gm,
      '<li style="margin: 0 0 8px 0; padding: 0;">$1</li>'
    );
    cleaned = cleaned.replace(
      /(<li style.*?<\/li>)(\s*<li style.*?<\/li>)*/g,
      '<ul style="margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc;">$&</ul>'
    );
  }

  // 9. S'assurer que les tableaux HTML sont bien formés
  cleaned = cleaned.replace(/<table>\s*<tbody>/g, '<table>');
  cleaned = cleaned.replace(/<\/tbody>\s*<\/table>/g, '</table>');

  // 10. Nettoyer les espaces inutiles, les lignes vides multiples
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}

module.exports = { cleanGeneratedDescription };
