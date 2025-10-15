// AppTools\src\components\common\EntityTable\components\BatchActions\components\ExportLabels\hooks\useAccordion.js
import { useState } from 'react';

export const useAccordion = (defaultOpenIds = []) => {
  // 🔧 Changement : au lieu d'un Set, on utilise une seule valeur (le premier ID par défaut)
  const [openPanel, setOpenPanel] = useState(defaultOpenIds[0] || null);

  const toggle = (id) => {
    // 🔧 Si le panel cliqué est déjà ouvert, on le ferme (null)
    // Sinon, on ouvre celui-ci (mode exclusif)
    setOpenPanel((prev) => (prev === id ? null : id));
  };

  const isOpen = (id) => openPanel === id;

  const open = (id) => {
    setOpenPanel(id);
  };

  const close = (id) => {
    // Ferme uniquement si c'est le panel actuellement ouvert
    setOpenPanel((prev) => (prev === id ? null : prev));
  };

  const openAll = () => {
    // En mode exclusif, on ouvre seulement le premier
    setOpenPanel(defaultOpenIds[0] || null);
  };

  const closeAll = () => {
    setOpenPanel(null);
  };

  return { toggle, isOpen, open, close, openAll, closeAll };
};
