// src/features/labels/components/FontSelector.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Type, Loader2, AlertTriangle } from 'lucide-react';
import { useGoogleFonts } from '../hooks/useGoogleFonts';
import { loadGoogleFont, SYSTEM_FONTS, FONT_STACKS } from '../utils/loadGoogleFont';

// Ordre d'affichage des catégories (Système d'abord)
const CATEGORY_ORDER = ['system', 'sans-serif', 'serif', 'display', 'handwriting', 'monospace'];

const CATEGORY_LABELS = {
  system: 'Système',
  'sans-serif': 'Sans Serif',
  serif: 'Serif',
  display: 'Display',
  handwriting: 'Écriture manuscrite',
  monospace: 'Monospace',
};

const Section = ({ title, children }) => (
  <div className="p-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
    <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">{title}</div>
    {children}
  </div>
);

const Option = ({ active, label, family, onClick, onHover, isSystem }) => {
  const familyStyle = FONT_STACKS[family] || family;
  return (
    <button
      type="button"
      onMouseEnter={onHover}
      onClick={onClick}
      className={`w-full text-left px-3 py-2 text-sm rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${
        active
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-900 dark:text-white'
      }`}
      style={{ fontFamily: familyStyle }}
      title={label + (isSystem ? ' (Système)' : '')}
    >
      {label}
    </button>
  );
};

// groupByCategory sans re-tri (on préserve l’ordre popularité/trending/date)
const groupByCategory = (fonts, shouldSortAlpha = false) => {
  const groups = new Map();
  for (const f of fonts) {
    const cat = (f.category || 'system').toLowerCase();
    if (!groups.has(cat)) groups.set(cat, []);
    groups.get(cat).push(f);
  }
  if (shouldSortAlpha) {
    for (const [, arr] of groups) arr.sort((a, b) => a.family.localeCompare(b.family));
  }
  return groups;
};

/**
 * Filtre + tri unifié pour la section "Résultats".
 * - Si sortBy === 'alpha' -> tri alpha
 * - Sinon -> on préserve l'ordre d'arrivée (système en tête, puis Google trié par l’API)
 */
function filterAndSortFlat(list, query, sortBy) {
  const q = query.trim().toLowerCase();
  let out = list;

  if (q) {
    out = list.filter(
      (f) => f.family.toLowerCase().includes(q) || (f.category || '').toLowerCase().includes(q)
    );
  }

  if (sortBy === 'alpha') {
    out = [...out].sort((a, b) => a.family.localeCompare(b.family));
  }
  // si popularity/trending/date -> on garde l’ordre reçu
  return out;
}

const FILTER_TABS = [
  { id: 'all', label: 'Tout' },
  { id: 'google', label: 'Google' },
  { id: 'system', label: 'Système' },
];

const FontSelector = ({
  value = 'Arial',
  onChange,
  className = '',
  apiKey = import.meta?.env?.VITE_GOOGLE_FONTS_KEY, // Vite
  onFontLoaded, // callback optionnel quand la police est prête
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all'); // all|google|system

  // On récupère le catalogue Google (non filtré côté hook)
  const { fonts: googleFonts, setSortBy, sortBy, loading, preload } = useGoogleFonts(apiKey);

  // Construire la liste "système"
  const systemArray = useMemo(
    () =>
      Array.from(SYSTEM_FONTS).map((f) => ({
        family: f,
        category: 'system',
        variants: ['regular'],
      })),
    []
  );

  // Appliquer le filtre source AVANT recherche
  const baseList = useMemo(() => {
    if (sourceFilter === 'system') return systemArray;
    if (sourceFilter === 'google') return googleFonts;
    return [...systemArray, ...googleFonts];
  }, [sourceFilter, systemArray, googleFonts]);

  // Calcul des résultats plats si recherche
  const searchResults = useMemo(() => {
    if (!search.trim()) return [];
    return filterAndSortFlat(baseList, search, sortBy);
  }, [baseList, search, sortBy]);

  // Grouped (uniquement si pas de recherche)
  const grouped = useMemo(() => {
    if (search.trim()) return [];
    const g = groupByCategory(baseList, sortBy === 'alpha');
    // On impose l’ordre des catégories seulement si on a "all"
    const categoriesOrder =
      sourceFilter === 'all'
        ? CATEGORY_ORDER
        : sourceFilter === 'system'
          ? ['system']
          : CATEGORY_ORDER.filter((c) => c !== 'system');

    const ordered = categoriesOrder.filter((c) => g.has(c)).map((c) => [c, g.get(c)]);
    return ordered;
  }, [baseList, sortBy, search, sourceFilter]);

  const handlePick = async (family) => {
    // Charge la police (si Google Font) avant de valider
    const isSystem = Array.from(SYSTEM_FONTS).includes(family);
    if (!isSystem) {
      await loadGoogleFont(family);
    }
    onChange?.(family);
    onFontLoaded?.(family);
    setIsOpen(false);
  };

  // Charger la police courante si c'est une Google Font (utile au mount)
  useEffect(() => {
    const isSystem = Array.from(SYSTEM_FONTS).includes(value);
    if (value && !isSystem) {
      loadGoogleFont(value);
    }
  }, [value]);

  const missingKey = !apiKey && typeof window !== 'undefined';
  const currentFontStyle = FONT_STACKS[value] || value;

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2">
        <Type className="h-4 w-4 text-gray-500 dark:text-gray-400" />
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsOpen((v) => !v)}
            className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors min-w-[220px] text-left flex items-center justify-between"
            style={{ fontFamily: currentFontStyle }}
          >
            <span className="truncate">{value || 'Arial'}</span>
            <svg
              className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </button>

          {isOpen && (
            <>
              {/* Overlay pour fermer le menu */}
              <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />

              <div className="absolute z-20 mt-1 w-[560px] bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-[75vh] overflow-hidden flex flex-col">
                {/* Barre d’outils (source + recherche + tri) */}
                <div className="flex items-center gap-2 p-2 border-b border-gray-200 dark:border-gray-700">
                  {/* Tabs source */}
                  <div className="flex -space-x-px rounded overflow-hidden border border-gray-300 dark:border-gray-600">
                    {FILTER_TABS.map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setSourceFilter(t.id)}
                        className={`px-3 py-1.5 text-sm ${
                          sourceFilter === t.id
                            ? 'bg-blue-600 text-white'
                            : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                        }`}
                        title={`Afficher: ${t.label}`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {/* Recherche */}
                  <input
                    type="text"
                    placeholder="Rechercher une police (nom, catégorie)…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 px-3 py-2 text-sm rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white outline-none"
                  />

                  {/* Tri */}
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="px-2 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    title="Critère de tri"
                  >
                    <option value="popularity">Populaire</option>
                    <option value="alpha">Alphabétique</option>
                    <option value="trending">Tendance</option>
                    <option value="date">Nouvelles</option>
                  </select>
                </div>

                {/* Alerte clé manquante (utile seulement pour la partie Google) */}
                {missingKey && sourceFilter !== 'system' && (
                  <div className="flex items-center gap-2 p-3 text-amber-600 dark:text-amber-400 text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    <span>
                      Clé Google Fonts absente. Ajoute{' '}
                      <code className="font-mono">VITE_GOOGLE_FONTS_KEY</code> dans{' '}
                      <code className="font-mono">.env.local</code>.
                    </span>
                  </div>
                )}

                {/* Contenu */}
                <div className="overflow-y-auto">
                  {loading && sourceFilter !== 'system' && !search && (
                    <div className="flex items-center gap-2 p-3 text-sm text-gray-500">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Chargement du catalogue…
                    </div>
                  )}

                  {/* Résultats (si recherche active) */}
                  {search.trim() && (
                    <Section title="Résultats">
                      {searchResults.length === 0 ? (
                        <div className="px-3 py-2 text-sm text-gray-500">
                          Aucun résultat pour « {search} ».
                        </div>
                      ) : (
                        searchResults.map((f, i) => {
                          const isSystem = f.category === 'system';
                          // Rang uniquement si popularité ET non-système
                          const label =
                            sortBy === 'popularity' && !isSystem
                              ? `${i + 1}. ${f.family}`
                              : f.family;

                          return (
                            <Option
                              key={`result-${f.category}-${f.family}-${i}`}
                              active={value === f.family}
                              label={label}
                              family={f.family}
                              onClick={() => handlePick(f.family)}
                              onHover={() => {
                                if (!isSystem) preload(f.family);
                              }}
                              isSystem={isSystem}
                            />
                          );
                        })
                      )}
                    </Section>
                  )}

                  {/* Groupes (si pas de recherche) */}
                  {!search.trim() &&
                    grouped.map(([cat, list]) => (
                      <Section key={cat} title={CATEGORY_LABELS[cat] || cat}>
                        {list.map((f, i) => {
                          const isSystem = cat === 'system';
                          const label =
                            sortBy === 'popularity' && !isSystem
                              ? `${i + 1}. ${f.family}`
                              : f.family;

                          return (
                            <Option
                              key={`${cat}-${f.family}-${i}`}
                              active={value === f.family}
                              label={label}
                              family={f.family}
                              onClick={() => handlePick(f.family)}
                              onHover={() => {
                                if (!isSystem) preload(f.family);
                              }}
                              isSystem={isSystem}
                            />
                          );
                        })}
                      </Section>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FontSelector;
