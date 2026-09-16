export type Options = {
  count?: number | null;
  enabled?: boolean | null;
  label?: string | null;
  items?: { label?: string | null }[] | null;
  cache?: string[] | null;
};

export function summarize(options: Options) {
  const { count, enabled, label, items } = options;
  return {
    count: count ?? 10,
    enabled: enabled ?? true,
    label: label ?? "default",
    first: items?.[0]?.label ?? "empty",
  };
}

export function ensureCache(options: Options, create: () => string[]) {
  return options.cache ??= create();
}

export function requiredLabel(items: { label: string }[]) {
  const [first] = items;
  if (!first) throw new Error("item required");
  return first.label;
}

export type Row = { category: string; value: number };

export function groupRows(rows: Row[]): Partial<Record<string, Row[]>> {
  return Object.groupBy(rows, row => row.category);
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
  try {
    if (typeof payload === "object" && payload !== null && "count" in payload) {
      const { count } = payload;
      if (typeof count === "number" && Number.isFinite(count)) return count;
    }
  } catch (cause) {
    throw new TypeError("finite numeric count required", { cause });
  }
  throw new TypeError("finite numeric count required");
}

export function lookupFirst<K extends object | string, V>(
  entries: readonly (readonly [K, V])[],
  keys: readonly K[],
) {
  const firstValues = new Map<K, V>();
  for (const [key, value] of entries) {
    if (!firstValues.has(key)) firstValues.set(key, value);
  }
  return keys.map(key => firstValues.get(key));
}

export function metadata() {
  const entries = new WeakMap<object, string>();
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

export function* sequence(
  limit: number,
  produced: (value: number) => void,
  closed: () => void,
): Iterable<number> {
  try {
    for (let value = 0; value < limit; value++) {
      produced(value);
      yield value;
    }
  } finally {
    closed();
  }
}

export type Policy = { mode: "fast" | "safe"; retries: number };

export const policy = { mode: "fast", retries: 0 } satisfies Policy;
