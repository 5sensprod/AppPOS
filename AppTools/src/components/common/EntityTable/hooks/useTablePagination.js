// src/components/common/EntityTable/hooks/useTablePagination.js
import { useState, useEffect, useMemo } from 'react';

export const useTablePagination = (data, paginationConfig) => {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(paginationConfig.pageSize);

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
      startItem,
      endItem,
      totalItems,
    };
  }, [currentPage, pageSize, totalItems, paginationConfig.enabled]);

  // Changer la taille de page et revenir à la première page
  const handlePageSizeChange = (newPageSize) => {
    setPageSize(newPageSize);
    setCurrentPage(1);
  };

  return {
    currentPage,
    pageSize,
    paginatedData,
    totalPages,
    setCurrentPage,
    setPageSize: handlePageSizeChange,
    paginationInfo,
  };
};
