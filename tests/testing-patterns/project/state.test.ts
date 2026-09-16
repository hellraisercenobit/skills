import { expect, test } from 'vitest';
import { order } from './state.ts';

test('submitted orders reject cancellation without changing their state', () => {
  const subject = order();
  expect(subject.status()).toBe('draft');
  subject.submit();
  expect(subject.status()).toBe('submitted');
  expect(() => subject.cancel()).toThrow(RangeError);
  expect(subject.status()).toBe('submitted');
});

test('a fresh order can be cancelled and cannot then be submitted', () => {
  const subject = order();
  subject.cancel();
  expect(subject.status()).toBe('cancelled');
  expect(() => subject.submit()).toThrow(RangeError);
});
