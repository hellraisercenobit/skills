import fc from 'fast-check';
import { expect, test } from 'vitest';
import { canonicalTags } from './properties.ts';

test('canonical tags preserve membership with unique ordered values', () => {
  fc.assert(fc.property(fc.array(fc.constantFrom('a', 'b', 'c')), tags => {
    const output = canonicalTags(tags);
    expect(output.every(tag => tags.some(input => input === tag))).toBe(true);
    expect(tags.every(tag => output.includes(tag))).toBe(true);
    expect(output.every((tag, index) => {
      const previous = output[index - 1];
      return previous === undefined || previous < tag;
    })).toBe(true);
  }), { seed: 20260916, numRuns: 100 });
});
