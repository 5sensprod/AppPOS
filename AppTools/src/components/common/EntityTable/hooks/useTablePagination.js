// src/components/common/EntityTable/hooks/useTablePagination.js
import { useState, useEffect, useMemo } from 'react';

export const useTablePagination = (
  data,
  {
    enabled = true,
    pageSize: defaultPageSize = 10,
    showPageSizeOptions = true,
    pageSizeOptions = [5, 10, 25, 50],
    // Nouveaux paramètres pour les préférences
    initialPage = 1,
    initialPageSize = null,
  } = {}
) => {
  // Utiliser les valeurs initiales ou les valeurs par défaut
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState(initialPageSize || defaultPageSize);

  const totalItems = data.length;
  const totalPages = enabled ? Math.max(1, Math.ceil(totalItems / pageSize)) : 1;

  // Revenir à la première page si le nombre total de pages diminue
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  // Données paginées
  const paginatedData = useMemo(() => {
    if (!enabled) return data;

    const startIndex = (currentPage - 1) * pageSize;
    return data.slice(startIndex, startIndex + pageSize);
  }, [data, currentPage, pageSize, enabled]);

  // Informations de pagination pour l'affichage
  const paginationInfo = useMemo(() => {
    const startItem = enabled ? (currentPage - 1) * pageSize + 1 : 1;
    const endItem = enabled ? Math.min(currentPage * pageSize, totalItems) : totalItems;

    return {
      startItem,
      endItem,
      totalItems,
    };
  }, [currentPage, pageSize, totalItems, enabled]);

  // Changer la page
  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  // Changer la taille de page et maintenir la position relative
  const handlePageSizeChange = (newPageSize) => {
    // Ajuster la page courante pour maintenir la même position relative
    const firstItemIndex = (currentPage - 1) * pageSize;
    const newPage = Math.floor(firstItemIndex / newPageSize) + 1;

    setPageSize(newPageSize);
    setCurrentPage(newPage);
  };

  return {
    currentPage,
    pageSize,
    paginatedData,
    totalPages,
    setCurrentPage: handlePageChange,
    setPageSize: handlePageSizeChange,
    paginationInfo,
  };
};
