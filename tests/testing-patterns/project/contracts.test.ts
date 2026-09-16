import { expect, test } from 'vitest';
import { parseAmount, paymentLabel, receipt } from './contracts.ts';

test('unknown amounts reject malformed input and preserve zero', () => {
  expect(parseAmount(0)).toBe(0);
  expect(parseAmount(10)).toBe(10);
  for (const input of [null, undefined, '10', -1, 1.5, Infinity, {}, NaN]) {
    expect(() => parseAmount(input)).toThrow(RangeError);
  }
});

test('receipt and discriminated payment expose their public values', () => {
  expect(receipt('EUR', 10)).toEqual({ currency: 'EUR', charge: 10 });
  expect(paymentLabel({ kind: 'paid', cents: 5 })).toBe('Paid 5');
  expect(paymentLabel({ kind: 'declined', code: 'LIMIT' })).toBe('LIMIT');
});
