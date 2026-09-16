import assert from 'node:assert/strict';
import test from 'node:test';
import {
  summarize, ensureCache, requiredLabel, groupRows, billableTotal, groupOnLegacy,
  parseCount, lookupFirst, metadata, enumerableMetadata, sequence,
} from './fixtures/modern-typescript/output.ts';

test('optional values preserve falsy data and cache initialization is lazy', () => {
  assert.deepEqual(summarize({}), { count: 10, enabled: true, label: 'default', first: 'empty' });
  assert.deepEqual(summarize({ count: null, enabled: null, label: null, items: null }),
    { count: 10, enabled: true, label: 'default', first: 'empty' });
  assert.deepEqual(summarize({ count: 0, enabled: false, label: '', items: [{ label: '' }] }),
    { count: 0, enabled: false, label: '', first: '' });
  assert.equal(summarize({ items: [] }).first, 'empty');
  assert.equal(summarize({ items: [{}] }).first, 'empty');
  assert.equal(summarize({ items: [{ label: null }] }).first, 'empty');
  let calls = 0;
  const create = () => { calls++; return ['created']; };
  const options = {};
  const cache = ensureCache(options, create);
  assert.equal(cache, options.cache);
  assert.equal(ensureCache(options, create), cache);
  assert.equal(calls, 1);
  const existing = [];
  assert.equal(ensureCache({ cache: existing }, create), existing);
  assert.equal(calls, 1);
  assert.deepEqual(ensureCache({ cache: null }, create), ['created']);
  assert.equal(calls, 2);
  assert.throws(() => requiredLabel([]), /item required/);
  assert.equal(requiredLabel([{ label: '' }]), '');
});

test('grouping preserves arbitrary keys, identity and order on both targets', () => {
  const first = { category: '__proto__', value: 1 };
  const second = { category: 'x', value: 2 };
  const third = { category: '__proto__', value: 3 };
  for (const group of [groupRows, groupOnLegacy]) {
    const result = group([first, second, third]);
    assert.equal(Object.getPrototypeOf(result), null);
    assert.deepEqual(result.__proto__, [first, third]);
    assert.equal(result.__proto__[0], first);
    assert.deepEqual(result.x, [second]);
    assert.deepEqual(Object.keys(group([])), []);
  }
  const native = Object.groupBy;
  try {
    Object.groupBy = undefined;
    assert.deepEqual(groupOnLegacy([first]).__proto__, [first]);
  } finally {
    Object.groupBy = native;
  }
});

test('a domain helper remains meaningful and external values are validated', () => {
  assert.equal(billableTotal([{ amount: 3, voided: false }, { amount: 9, voided: true }]), 3);
  assert.equal(billableTotal([]), 0);
  assert.equal(parseCount({ count: 0 }), 0);
  assert.equal(parseCount({ count: 4 }), 4);
  for (const invalid of [null, undefined, {}, { count: '4' }, { count: Infinity }, { count: NaN }, 4]) {
    assert.throws(() => parseCount(invalid), TypeError);
  }
  const throwingAccessor = { get count() { throw new RangeError('external getter'); } };
  const throwingProxy = new Proxy({}, { has() { throw 'external trap'; } });
  assert.throws(() => parseCount(throwingAccessor), TypeError);
  assert.throws(() => parseCount(throwingProxy), TypeError);
});

test('batch lookups preserve duplicate policy and object identity', () => {
  const one = {};
  const other = {};
  const entries = [[one, 'first'], [one, 'duplicate'], ['x', 'string']];
  assert.deepEqual(lookupFirst(entries, [one, other, 'x', 'missing']), ['first', undefined, 'string', undefined]);
});

test('metadata supports owned operations without assuming garbage collection', () => {
  const first = {};
  const other = {};
  const store = metadata();
  store.set(first, 'a');
  assert.equal(store.get(first), 'a');
  assert.equal(store.get(other), undefined);
  assert.equal(store.remove(first), true);
  assert.equal(store.get(first), undefined);
  const listing = enumerableMetadata();
  listing.set(first, 'a');
  listing.set(other, 'b');
  assert.deepEqual(listing.keys(), [first, other]);
});

test('partial sequence consumption produces only requested values and cleans up', () => {
  const produced = [];
  let closed = 0;
  const result = sequence(5, value => produced.push(value), () => closed++);
  assert.deepEqual(produced, []);
  const consumed = [];
  for (const value of result) {
    consumed.push(value);
    if (consumed.length === 2) break;
  }
  assert.deepEqual(consumed, [0, 1]);
  assert.deepEqual(produced, [0, 1]);
  assert.equal(closed, 1);
});
