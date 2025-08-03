// utils/labelUtils.js
export const calculateGridDimensions = (layout) => {
  const pageWidth = 210;
  const pageHeight = 297;
  const usableWidth = pageWidth - (layout.offsetLeft || 8) * 2;
  const usableHeight = pageHeight - (layout.offsetTop || 22) * 2;
  const columns = Math.floor(usableWidth / ((layout.width || 48.5) + (layout.spacingH || 0)));
  const rows = Math.floor(usableHeight / ((layout.height || 25) + (layout.spacingV || 0)));
  return { columns, rows, total: columns * rows };
};

export const generateExportTitle = (activeFilters, entityNamePlural) => {
  let title = `Étiquettes ${entityNamePlural}`;
  if (activeFilters.length) {
    const byType = activeFilters.reduce((acc, f) => {
      const [, val] = f.label.split(': ');
      acc[f.type] = acc[f.type] || [];
      acc[f.type].push(val || f.label);
      return acc;
    }, {});
    const parts = Object.values(byType).map((vals) => vals.join(', '));
    if (parts.length) title += ` - ${parts.join(' - ')}`;
  }
  return title.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_');
};
