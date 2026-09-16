import { expect, test } from 'vitest';
import { pages } from './iteration.ts';

test('partial consumption produces exactly the requested prefix and closes once', () => {
  const produced: number[] = [];
  let closed = 0;
  const iterator = pages(100, value => produced.push(value), () => { closed++; });
  expect(produced).toEqual([]);
  const result: number[] = [];
  for (const value of iterator) {
    result.push(value);
    if (result.length === 2) break;
  }
  expect(result).toEqual([0, 1]);
  expect(produced).toEqual([0, 1]);
  expect(closed).toBe(1);
});

test('a consumer failure closes the started iterator', () => {
  let closed = 0;
  expect(() => {
    for (const value of pages(10, () => {}, () => { closed++; })) {
      throw new Error(`Consumer failed at ${value}`);
    }
  }).toThrow('Consumer failed at 0');
  expect(closed).toBe(1);
});
