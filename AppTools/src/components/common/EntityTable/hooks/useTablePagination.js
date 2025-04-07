// src/components/common/EntityTable/hooks/useTablePagination.js
import { useState, useEffect, useMemo } from 'react';
import { usePaginationStore } from '../../../../stores/usePaginationStore';

export const useTablePagination = (data, paginationConfig, entityName = 'default') => {
  // Récupérer les paramètres de pagination depuis le store Zustand
  const {
    getPaginationParams,
    setCurrentPage: setStorePage,
    setPageSize: setStorePageSize,
  } = usePaginationStore();

  // Récupérer les valeurs sauvegardées
  const { currentPage: storedPage, pageSize: storedPageSize } = getPaginationParams(entityName);

  // Utiliser les valeurs du store comme état initial
  const [currentPage, setLocalCurrentPage] = useState(storedPage);
  const [pageSize, setLocalPageSize] = useState(
    paginationConfig.pageSize ? paginationConfig.pageSize : storedPageSize
  );

  // Synchroniser l'état local avec le store pour la page
  const setCurrentPage = (page) => {
    setLocalCurrentPage(page);
    setStorePage(entityName, page);
  };

  // Synchroniser l'état local avec le store pour la taille de page
  const setPageSize = (size) => {
    setLocalPageSize(size);
    setStorePageSize(entityName, size);
  };

  const totalItems = data.length;
  const totalPages = paginationConfig.enabled ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;

  // Revenir à la première page si le nombre total de pages diminue
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Données paginées
  const paginatedData = useMemo(() => {
    if (!paginationConfig.enabled) return data;

    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, currentPage, pageSize, paginationConfig.enabled]);

  // Informations de pagination pour l'affichage
  const paginationInfo = useMemo(() => {
    const startItem = paginationConfig.enabled ? (currentPage - 1) * pageSize + 1 : 1;
    const endItem = paginationConfig.enabled
      ? Math.min(currentPage * pageSize, totalItems)
      : totalItems;

    return {
      startItem: totalItems === 0 ? 0 : startItem,
      endItem: totalItems === 0 ? 0 : endItem,
      totalItems,
    };
  }, [currentPage, pageSize, totalItems, paginationConfig.enabled]);

  return {
    currentPage,
    pageSize,
    paginatedData,
    totalPages,
    setCurrentPage,
    setPageSize,
    paginationInfo,
  };
};
