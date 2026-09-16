import { expect, test } from 'vitest';
import { shipping } from './domain.ts';

test.each([[99, 10], [100, 0], [101, 0]])('shipping(%i) costs %i', (amount, charge) => {
  expect(shipping(amount)).toBe(charge);
});
