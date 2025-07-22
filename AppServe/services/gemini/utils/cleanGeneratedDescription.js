// services/gemini/utils/cleanGeneratedDescription.js - Version ultra-simplifiée

/**
 * Nettoie la description générée par l'IA pour supprimer les symboles Markdown
 * et s'assurer que le HTML est correctement formaté pour WooCommerce
 * @param {string} description La description brute générée par l'IA
 * @returns {string} La description nettoyée
 */
function cleanGeneratedDescription(description) {
  if (!description) return '';

  let cleaned = description;

  // 1. Supprimer les blocs de code markdown
  cleaned = cleaned.replace(/```[a-z]*\s*([\s\S]*?)```/g, '$1');

  // 2. Extraire le contenu du body si structure HTML complète
  if (cleaned.includes('<!DOCTYPE html>') || cleaned.includes('<html')) {
    const bodyMatch = cleaned.match(/<body>([\s\S]*?)<\/body>/i);
    if (bodyMatch && bodyMatch[1]) {
      cleaned = bodyMatch[1].trim();
    }
  }

  // 3. Supprimer les commentaires et explications
  cleaned = cleaned.replace(/^\s*\d+\.\s*/gm, '');
  cleaned = cleaned.replace(/^(Voici|Voilà|Ici|J'ai créé|J'ai généré|Voici le code HTML).*$/gm, '');
  cleaned = cleaned.replace(/^(Note|Important|Remarque):.*$/gm, '');
  cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');

  // 4. Supprimer les balises dangereuses
  const forbiddenTags = ['script', 'iframe', 'object', 'embed', 'form', 'input', 'button'];
  forbiddenTags.forEach((tag) => {
    const regex = new RegExp(`<${tag}[^>]*>.*?</${tag}>`, 'gi');
    cleaned = cleaned.replace(regex, '');
  });

  // 5. Convertir Markdown en HTML simple
  cleaned = cleaned.replace(/\*\*([^*]+):\*\*/g, '<strong>$1:</strong>');
  cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  cleaned = cleaned.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 6. Convertir listes Markdown en HTML (si pas déjà en HTML)
  if (!cleaned.includes('<ul') && !cleaned.includes('<ol')) {
    // Remplacer les listes à puces simples
    cleaned = cleaned.replace(/^\s*[-*]\s+(.+)$/gm, '<li>$1</li>');

    // Envelopper les li consécutifs dans des ul
    cleaned = cleaned.replace(/(<li>.*?<\/li>)(\s*<li>.*?<\/li>)+/gs, '<ul>$&</ul>');
  }

  // 7. Nettoyer les événements JavaScript
  cleaned = cleaned.replace(/\s(on\w+)=["'][^"']*["']/gi, '');

  // 8. Nettoyer les espaces et lignes vides multiples
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
  cleaned = cleaned.replace(/\s{3,}/g, ' ');
  cleaned = cleaned.trim();

  // 9. Correction basique des balises non fermées
  cleaned = fixBasicHtmlStructure(cleaned);

  return cleaned;
}

/**
 * Correction basique des balises HTML mal fermées
 * @param {string} html Le HTML à corriger
 * @returns {string} Le HTML corrigé
 */
function fixBasicHtmlStructure(html) {
  // Correction simple pour les balises les plus courantes
  const tagPairs = [
    ['<div', '</div>'],
    ['<p', '</p>'],
    ['<ul', '</ul>'],
    ['<ol', '</ol>'],
    ['<table', '</table>'],
    ['<tr', '</tr>'],
    ['<td', '</td>'],
    ['<th', '</th>'],
  ];

  let fixed = html;

  tagPairs.forEach(([openTag, closeTag]) => {
    const openCount = (fixed.match(new RegExp(openTag, 'gi')) || []).length;
    const closeCount = (fixed.match(new RegExp(closeTag.replace('</', '<\\/'), 'gi')) || []).length;

    // Ajouter les balises fermantes manquantes
    if (openCount > closeCount) {
      const missing = openCount - closeCount;
      for (let i = 0; i < missing; i++) {
        fixed += closeTag;
      }
    }
  });

  return fixed;
}

module.exports = { cleanGeneratedDescription };
