import { expect, test } from 'vitest';
import { legacyLabel } from './legacy.ts';

test.each([['  Ada ', 'ADA'], [' ', 'ANONYMOUS'], ['ß', 'SS']])('legacy label %j is %j', (input, output) => {
  expect(legacyLabel(input)).toBe(output);
});
