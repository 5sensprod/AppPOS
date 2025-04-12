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

  // 5. Supprimer les balises script et commentaires HTML (NOUVEAU)
  cleaned = cleaned.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 6. Protéger les attributs style avant conversions Markdown (AMÉLIORÉ)
  const styleMatches = [];
  let counter = 0;
  cleaned = cleaned.replace(
    /<([a-z0-9]+)([^>]*?style=["'](?:[^"'\\]|\\.)*["'])([^>]*)>/gi,
    (match, tag, styleAttr, rest) => {
      const placeholder = `__STYLE_PLACEHOLDER_${counter}__`;
      styleMatches[counter] = { tag, styleAttr, rest };
      counter++;
      return placeholder;
    }
  );

  // 7. Convertir le format Markdown pour les points forts et autres sections
  cleaned = cleaned.replace(/\*\*([^*]+):\*\*/g, '<strong>$1:</strong>');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 8. Restaurer les balises avec attributs style
  for (let i = 0; i < styleMatches.length; i++) {
    const { tag, styleAttr, rest } = styleMatches[i];
    const placeholder = `__STYLE_PLACEHOLDER_${i}__`;
    cleaned = cleaned.replace(placeholder, `<${tag}${styleAttr}${rest}>`);
  }

  // 9. Remplacer les listes à puces Markdown par du HTML si non déjà formaté
  if (!cleaned.includes('<ul style=')) {
    cleaned = cleaned.replace(
      /^\s*-\s+(.+)$/gm,
      '<li style="margin: 0 0 8px 0; padding: 0;">$1</li>'
    );
    cleaned = cleaned.replace(
      /^\s*\*\s+(.+)$/gm,
      '<li style="margin: 0 0 8px 0; padding: 0;">$1</li>'
    );

    // Envelopper les items dans des balises ul (AMÉLIORÉ)
    const liPattern = '(<li style[^>]*>[^<]*<\\/li>)';
    const liRegex = new RegExp(`${liPattern}(\\s*${liPattern})*`, 'g');
    cleaned = cleaned.replace(
      liRegex,
      '<ul style="margin: 0 0 20px 0; padding: 0 0 0 20px; list-style-type: disc;">$&</ul>'
    );
  }

  // 10. S'assurer que les tableaux HTML sont bien formés
  cleaned = cleaned.replace(/<table>\s*<tbody>/g, '<table>');
  cleaned = cleaned.replace(/<\/tbody>\s*<\/table>/g, '</table>');

  // 11. Échapper les chevrons isolés qui ne font pas partie de balises HTML (NOUVEAU)
  // Version simplifiée qui peut avoir des limitations
  cleaned = cleaned.replace(/([^<])<([^a-z\/!\s])/gi, '$1&lt;$2');
  cleaned = cleaned.replace(/([^0-9a-z"\/])>([^>])/gi, '$1&gt;$2');

  // 12. Supprimer les balises non autorisées (NOUVEAU)
  const forbiddenTags = [
    'iframe',
    'object',
    'embed',
    'form',
    'input',
    'button',
    'meta',
    'link',
    'style',
    'head',
    'html',
    'body',
  ];
  forbiddenTags.forEach((tag) => {
    const openTagRegex = new RegExp(`<${tag}[^>]*>`, 'gi');
    const closeTagRegex = new RegExp(`</${tag}>`, 'gi');
    cleaned = cleaned.replace(openTagRegex, '');
    cleaned = cleaned.replace(closeTagRegex, '');
  });

  // 13. Nettoyer les événements JavaScript dans les attributs (NOUVEAU)
  cleaned = cleaned.replace(/\s(on\w+)="[^"]*"/gi, '');
  cleaned = cleaned.replace(/\s(on\w+)='[^']*'/gi, '');

  // 14. Nettoyer les espaces inutiles, les lignes vides multiples
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.trim();

  return cleaned;
}

module.exports = { cleanGeneratedDescription };
