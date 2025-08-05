import { useState } from 'react';

export const useAccordion = (defaultOpenIds = []) => {
  const [openPanels, setOpenPanels] = useState(new Set(defaultOpenIds));

  const toggle = (id) => {
    setOpenPanels((prev) => {
      const newSet = new Set(prev);
      newSet.has(id) ? newSet.delete(id) : newSet.add(id);
      return newSet;
    });
  };

  const isOpen = (id) => openPanels.has(id);

  const open = (id) => {
    setOpenPanels((prev) => new Set(prev).add(id));
  };

  const close = (id) => {
    setOpenPanels((prev) => {
      const newSet = new Set(prev);
      newSet.delete(id);
      return newSet;
    });
  };

  const openAll = () => setOpenPanels(new Set(defaultOpenIds));
  const closeAll = () => setOpenPanels(new Set());

  return { toggle, isOpen, open, close, openAll, closeAll };
};
