export function selectTrendMetricColumns(params: {
  metrics: string[];
  columns: string[];
  rows: Array<Record<string, unknown>>;
}): string[] {
  const columnLookup = new Map(params.columns.map((column) => [column.toLowerCase(), column]));
  const requested = Array.from(new Set(
    params.metrics.flatMap((metric) => {
      const normalizedMetric = metric.trim().toLowerCase();
      if (!normalizedMetric) return [];
      const exact = columnLookup.get(normalizedMetric);
      if (exact) return [exact];
      const matched = params.columns.filter((column) => {
        const normalizedColumn = column.toLowerCase();
        return normalizedColumn === normalizedMetric
          || normalizedColumn.includes(normalizedMetric)
          || normalizedMetric.includes(normalizedColumn);
      });
      return matched.length > 0 ? [matched[0]] : [];
    }),
  ));
  if (requested.length > 0) return requested;

  const fallback = params.columns.filter((column) => params.rows.some((row) => typeof row[column] === 'number' || Number.isFinite(Number(row[column]))));
  return fallback.slice(0, 1);
}
