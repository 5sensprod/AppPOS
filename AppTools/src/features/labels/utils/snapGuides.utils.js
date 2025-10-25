// src/features/labels/utils/snapGuides.utils.js

/**
 * Calcule les bounds d'un élément à partir du node Konva si disponible
 * Sinon, fait une estimation
 */
export const getElementBounds = (element, konvaNode = null) => {
  const scaleX = element.scaleX || 1;
  const scaleY = element.scaleY || 1;
  const x = element.x || 0;
  const y = element.y || 0;

  // 🔥 Si on a le node Konva, utiliser ses vraies dimensions
  if (konvaNode) {
    try {
      // Pour les Group (QRCode, Barcode), on doit calculer différemment
      const isGroup = konvaNode.getClassName?.() === 'Group';

      if (isGroup) {
        // Pour un Group, utiliser les dimensions des enfants
        const children = konvaNode.getChildren();
        if (children.length > 0) {
          // Prendre le premier enfant (l'image)
          const child = children[0];
          const childWidth = child.width() * (element.scaleX || 1);
          const childHeight = child.height() * (element.scaleY || 1);

          return {
            x,
            y,
            width: childWidth,
            height: childHeight,
            centerX: x + childWidth / 2,
            centerY: y + childHeight / 2,
            right: x + childWidth,
            bottom: y + childHeight,
          };
        }
      } else {
        // Pour les nodes simples (Text, Image), utiliser getClientRect
        const box = konvaNode.getClientRect({
          skipTransform: true,
          skipStroke: false,
          relativeTo: konvaNode.getParent(),
        });

        return {
          x,
          y,
          width: box.width,
          height: box.height,
          centerX: x + box.width / 2,
          centerY: y + box.height / 2,
          right: x + box.width,
          bottom: y + box.height,
        };
      }
    } catch (err) {
      console.warn('Erreur getClientRect:', err);
      // Fallback sur l'estimation si erreur
    }
  }

  // Estimation manuelle si pas de node ou si erreur
  let width = 0;
  let height = 0;

  switch (element.type) {
    case 'text': {
      const fontSize = element.fontSize || 16;
      const text = element.text || '';
      // Ratio moyen : ~0.55 pour la plupart des polices
      width = text.length * fontSize * 0.55;
      height = fontSize;
      break;
    }
    case 'qrcode':
      width = element.size || 160;
      height = element.size || 160;
      break;
    case 'image':
      width = element.width || 160;
      height = element.height || 160;
      break;
    case 'barcode':
      width = element.width || 200;
      height = element.height || 80;
      break;
    default:
      width = 100;
      height = 100;
  }

  return {
    x,
    y,
    width: width * scaleX,
    height: height * scaleY,
    centerX: x + (width * scaleX) / 2,
    centerY: y + (height * scaleY) / 2,
    right: x + width * scaleX,
    bottom: y + height * scaleY,
  };
};

/**
 * Génère les guides d'alignement entre l'élément déplacé et les autres
 * @param {object} movingElement - L'élément en cours de déplacement
 * @param {object} movingNode - Le node Konva en mouvement (pour vraies dimensions)
 * @param {array} otherElements - Tous les autres éléments
 * @param {object} canvasSize - { width, height } du canvas
 * @param {number} snapThreshold - Distance de snap en pixels (défaut: 5)
 * @param {Function} findNodeById - Fonction pour trouver un node Konva par ID
 * @returns {object} { guides: [], snapX: null, snapY: null }
 */
export const calculateSnapGuides = (
  movingElement,
  movingNode,
  otherElements,
  canvasSize,
  snapThreshold = 5,
  findNodeById = null
) => {
  if (!movingElement) return { guides: [], snapX: null, snapY: null };

  const movingBounds = getElementBounds(movingElement, movingNode);
  const guides = [];
  let snapX = null;
  let snapY = null;
  let minDistX = Infinity;
  let minDistY = Infinity;

  // Points de référence pour l'élément en mouvement
  const movingPoints = {
    left: movingBounds.x,
    centerX: movingBounds.centerX,
    right: movingBounds.right,
    top: movingBounds.y,
    centerY: movingBounds.centerY,
    bottom: movingBounds.bottom,
  };

  // 🎯 Ajouter le centre du canvas comme référence PRIORITAIRE
  const canvasCenterRef = {
    x: canvasSize.width / 2,
    y: canvasSize.height / 2,
    width: 0,
    height: 0,
    type: 'canvas-center',
    // Points d'alignement du centre
    centerX: canvasSize.width / 2,
    centerY: canvasSize.height / 2,
  };

  // Ajouter les bords du canvas comme références
  const canvasReferences = [
    { x: 0, y: 0, width: canvasSize.width, height: canvasSize.height, type: 'canvas' },
    canvasCenterRef, // 🆕 Centre du canvas
  ];

  const allReferences = [...otherElements, ...canvasReferences];

  allReferences.forEach((ref) => {
    // 🔥 Essayer de trouver le node Konva de la référence pour plus de précision
    const refNode = findNodeById && ref.id ? findNodeById(ref.id) : null;
    const refBounds = getElementBounds(ref, refNode);

    const refPoints = {
      left: refBounds.x,
      centerX: refBounds.centerX,
      right: refBounds.right,
      top: refBounds.y,
      centerY: refBounds.centerY,
      bottom: refBounds.bottom,
    };

    // Vérifier alignement horizontal (X)
    Object.entries(movingPoints).forEach(([movingKey, movingVal]) => {
      if (!['left', 'centerX', 'right'].includes(movingKey)) return;

      Object.entries(refPoints).forEach(([refKey, refVal]) => {
        if (!['left', 'centerX', 'right'].includes(refKey)) return;

        const dist = Math.abs(movingVal - refVal);

        if (dist < snapThreshold && dist < minDistX) {
          minDistX = dist;
          snapX = refVal - (movingVal - movingBounds.x); // Ajuster la position X

          // Créer le guide vertical qui traverse tout le canvas
          guides.push({
            type: 'vertical',
            x: refVal,
            y1: 0,
            y2: canvasSize.height,
          });
        }
      });
    });

    // Vérifier alignement vertical (Y)
    Object.entries(movingPoints).forEach(([movingKey, movingVal]) => {
      if (!['top', 'centerY', 'bottom'].includes(movingKey)) return;

      Object.entries(refPoints).forEach(([refKey, refVal]) => {
        if (!['top', 'centerY', 'bottom'].includes(refKey)) return;

        const dist = Math.abs(movingVal - refVal);

        if (dist < snapThreshold && dist < minDistY) {
          minDistY = dist;
          snapY = refVal - (movingVal - movingBounds.y); // Ajuster la position Y

          // Créer le guide horizontal qui traverse tout le canvas
          guides.push({
            type: 'horizontal',
            y: refVal,
            x1: 0,
            x2: canvasSize.width,
          });
        }
      });
    });
  });

  // Éliminer les guides en double
  const uniqueGuides = guides.reduce((acc, guide) => {
    const key = guide.type === 'vertical' ? `v-${guide.x.toFixed(1)}` : `h-${guide.y.toFixed(1)}`;

    if (!acc.has(key)) {
      acc.set(key, guide);
    }
    return acc;
  }, new Map());

  return {
    guides: Array.from(uniqueGuides.values()),
    snapX: minDistX < snapThreshold ? snapX : null,
    snapY: minDistY < snapThreshold ? snapY : null,
  };
};
