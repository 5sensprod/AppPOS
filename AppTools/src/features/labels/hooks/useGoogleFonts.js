// src/features/labels/hooks/useGoogleFonts.js
import { useEffect, useMemo, useState } from 'react';
import { fetchGoogleFontsCatalog } from '../services/googleFonts.service';
import { loadGoogleFont } from '../utils/loadGoogleFont';

/**
 * Hook pour Google Fonts : catalogue, recherche, tri, préchargement.
 */
export function useGoogleFonts(apiKey) {
  const [fonts, setFonts] = useState([]);
  const [q, setQ] = useState('');
  const [sortBy, setSortBy] = useState('popularity'); // popularity|alpha|trending|date|style
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!apiKey) return;
      setLoading(true);
      try {
        const data = await fetchGoogleFontsCatalog(apiKey, sortBy);
        if (!cancelled) setFonts(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, sortBy]);

  // Filtre par nom/catégorie (sur le catalogue Google uniquement)
  const filteredGoogle = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return fonts;
    return fonts.filter(
      (f) =>
        f.family.toLowerCase().includes(query) || (f.category || '').toLowerCase().includes(query)
    );
  }, [fonts, q]);

  // Précharge simple (survol)
  const preload = (family) => loadGoogleFont(family);

  return {
    fonts: filteredGoogle,
    setQuery: setQ,
    setSortBy,
    sortBy,
    loading,
    preload,
  };
}
