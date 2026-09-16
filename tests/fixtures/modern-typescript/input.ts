export type Options = {
  count?: number | null;
  enabled?: boolean | null;
  label?: string | null;
  items?: { label?: string | null }[] | null;
  cache?: string[] | null;
};

export function summarize(options: Options) {
  const count = options.count;
  const enabled = options.enabled;
  const label = options.label;
  const items = options.items;
  return {
    count: count === null || count === undefined ? 10 : count,
    enabled: enabled === null || enabled === undefined ? true : enabled,
    label: label === null || label === undefined ? "default" : label,
    first: items && items[0] && items[0].label != null ? items[0].label : "empty",
  };
}

export function ensureCache(options: Options, create: () => string[]) {
  if (options.cache === null || options.cache === undefined) options.cache = create();
  return options.cache;
}

export function requiredLabel(items: { label: string }[]) {
  if (items.length === 0) throw new Error("item required");
  return items[0]!.label;
}

export type Row = { category: string; value: number };
export function groupRows(rows: Row[]): Partial<Record<string, Row[]>> {
  const groups: Partial<Record<string, Row[]>> = Object.create(null);
  for (const row of rows) {
    if (!groups[row.category]) groups[row.category] = [];
    groups[row.category]!.push(row);
  }
  return groups;
}

export function billableTotal(rows: readonly { amount: number; voided: boolean }[]) {
  return rows.reduce((total, row) => total + (row.voided ? 0 : row.amount), 0);
}

export function groupOnLegacy(rows: Row[]): Partial<Record<string, Row[]>> {
  const groups: Partial<Record<string, Row[]>> = Object.create(null);
  for (const row of rows) {
    (groups[row.category] ??= []).push(row);
  }
  return groups;
}

export function parseCount(payload: unknown): number {
  return (payload as { count: number }).count;
}

export function lookupFirst<K, V>(entries: readonly (readonly [K, V])[], keys: readonly K[]) {
  return keys.map(key => entries.find(entry => Object.is(entry[0], key))?.[1]);
}

export function metadata() {
  const entries = new Map<object, string>();
  return {
    set(key: object, value: string) { entries.set(key, value); },
    get(key: object) { return entries.get(key); },
    remove(key: object) { return entries.delete(key); },
  };
}

export function enumerableMetadata() {
  const entries = new Map<object, string>();
  return {
    set(key: object, value: string) { entries.set(key, value); },
    get(key: object) { return entries.get(key); },
    keys() { return [...entries.keys()]; },
  };
}

export function sequence(limit: number, produced: (value: number) => void, closed: () => void): Iterable<number> {
  const values: number[] = [];
  try {
    for (let value = 0; value < limit; value++) {
      produced(value);
      values.push(value);
    }
  } finally {
    closed();
  }
  return values;
}
