export interface Store {
  put(key: string, value: string): Promise<void>;
  get(key: string): Promise<string | undefined>;
  reset(): Promise<void>;
}

export function memoryStore(): Store {
  const values = new Map<string, string>();
  return {
    async put(key, value) { values.set(key, value); },
    async get(key) { return values.get(key); },
    async reset() { values.clear(); },
  };
}

export function fileStore(directory: string): Store {
  const path = (key: string) => join(directory, `${Buffer.from(key, 'utf16le').toString('hex')}.txt`);
  return {
    async put(key, value) { await writeFile(path(key), value, 'utf16le'); },
    async get(key) {
      try { return await readFile(path(key), 'utf16le'); }
      catch (error) {
        if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return undefined;
        throw error;
      }
    },
    async reset() {
      await Promise.all((await readdir(directory)).map(name => rm(join(directory, name))));
    },
  };
}
import { readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
