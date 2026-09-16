import {
  billableTotal, ensureCache, enumerableMetadata, groupOnLegacy, groupRows,
  lookupFirst, metadata, parseCount, policy, requiredLabel, sequence, summarize,
} from "./output.js";
import type { Options, Policy, Row } from "./output.js";

const options: Options = { count: 0, enabled: false, label: "" };
const summary: { count: number; enabled: boolean; label: string; first: string } = summarize(options);
const cache: string[] = ensureCache(options, () => []);
const label: string = requiredLabel([{ label: "" }]);
const rows: Row[] = [];
const grouped: Partial<Record<string, Row[]>> = groupRows(rows);
const legacy: Partial<Record<string, Row[]>> = groupOnLegacy(rows);
const total: number = billableTotal([{ amount: 2, voided: false }] as const);
const count: number = parseCount({ count: 0 });
const key = {};
const found: (number | undefined)[] = lookupFirst<object | string, number>([[key, 1], ["key", 2]], [key, "missing"]);
const labels = metadata();
labels.set(key, "one");
const removed: boolean = labels.remove(key);
const view = enumerableMetadata();
const keys: object[] = view.keys();
const values: Iterable<number> = sequence(10, () => {}, () => {});
const mode: "fast" = policy.mode;
const config: Policy = policy;
void [summary, cache, label, grouped, legacy, total, count, found, removed, keys, values, mode, config];
