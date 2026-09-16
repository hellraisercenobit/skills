import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, expect, test } from 'vitest';
import { fileStore, memoryStore, type Store } from './storage.ts';

const directories: string[] = [];
const resourceTest = test.extend<{ directory: string }>({
  directory: async ({}, use) => {
    const directory = await mkdtemp(join(tmpdir(), 'testing-patterns-store-'));
    directories.push(directory);
    try { await use(directory); }
    finally { await rm(directory, { recursive: true, force: true }); }
  },
});

async function contract(store: Store) {
  const distinctKeys = [['\ud800', 'high:\ud800'], ['\udc00', '\u0000low:\udc00'], ['\ufffd', 'replacement'], ['A', 'upper'], ['a', 'lower']] as const;
  for (const [key, value] of distinctKeys) {
    expect(await store.get(key)).toBeUndefined();
    await store.put(key, value);
  }
  for (const [key, value] of distinctKeys) expect(await store.get(key)).toBe(value);
  expect(await store.get('missing')).toBeUndefined();
  await store.put('../key', 'first');
  await store.put('other', 'separate');
  await store.put('../key', 'replacement');
  expect(await store.get('../key')).toBe('replacement');
  expect(await store.get('other')).toBe('separate');
  await store.reset();
  expect(await store.get('../key')).toBeUndefined();
  expect(await store.get('other')).toBeUndefined();
  for (const [key] of distinctKeys) expect(await store.get(key)).toBeUndefined();
}

test('memory fake satisfies key replacement and reset contract', async () => {
  await contract(memoryStore());
});

resourceTest('real file adapter satisfies the same contract and persists across instances', async ({ directory }) => {
  await contract(fileStore(directory));
  await fileStore(directory).put('saved', 'value');
  expect(await fileStore(directory).get('saved')).toBe('value');
});

afterAll(async () => {
  expect(directories.length).toBeGreaterThan(0);
  for (const directory of directories) await expect(stat(directory)).rejects.toMatchObject({ code: 'ENOENT' });
});
