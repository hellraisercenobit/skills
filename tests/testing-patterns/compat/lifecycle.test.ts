import { afterAll, expect, test, vi } from 'vitest';

test('clear removes history and keeps the current mock implementation', () => {
  const read = vi.fn(() => 'original').mockImplementation(() => 'replacement');
  expect(read()).toBe('replacement');
  read.mockClear();
  expect(read).not.toHaveBeenCalled();
  expect(read()).toBe('replacement');
});

test('reset restores the initial mock implementation and removes one-shot behavior', () => {
  const read = vi.fn(() => 'original').mockImplementation(() => 'replacement');
  read();
  read.mockReturnValueOnce('once');
  read.mockReset();
  expect(read).not.toHaveBeenCalled();
  expect(read()).toBe('original');
});

test('restore returns a spied method to the original function', () => {
  const service = { read: () => 'original' };
  const original = service.read;
  const spy = vi.spyOn(service, 'read').mockReturnValue('replacement');
  try { expect(service.read()).toBe('replacement'); }
  finally { spy.mockRestore(); }
  expect(service.read).toBe(original);
  expect(service.read()).toBe('original');
});

const resources: Array<{ closed: boolean }> = [];
const resourceTest = test.extend('resource', ({}, { onCleanup }) => {
  const resource = { closed: false };
  resources.push(resource);
  onCleanup(() => { resource.closed = true; });
  return resource;
});

resourceTest('named fixture is live during its test', ({ resource }) => {
  expect(resource.closed).toBe(false);
});

afterAll(() => {
  expect(resources).toEqual([{ closed: true }]);
});
