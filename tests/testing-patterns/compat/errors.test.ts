import { expect, test, vi } from 'vitest';

class LimitError extends Error { readonly code = 'LIMIT'; }

async function assertLimit(operation: () => Promise<unknown>) {
  const outcome = await operation().then(
    value => ({ kind: 'resolved' as const, value }),
    (error: unknown) => ({ kind: 'rejected' as const, error }),
  );
  expect(outcome.kind).toBe('rejected');
  if (outcome.kind !== 'rejected') throw new Error('Expected rejection');
  expect(outcome.error).toBeInstanceOf(LimitError);
  expect(outcome.error).toMatchObject({ code: 'LIMIT', message: 'Limit reached' });
}

test('error recipe observes a stateful action only once', async () => {
  const operation = vi.fn<() => Promise<never>>().mockRejectedValue(new LimitError('Limit reached'));
  await assertLimit(operation);
  expect(operation).toHaveBeenCalledTimes(1);
});

test.each([
  () => Promise.reject(new TypeError('Limit reached')),
  () => Promise.resolve('no rejection'),
  () => Promise.reject(new ReferenceError('accidental failure')),
])('error recipe refuses a false-positive outcome %#', async operation => {
  await expect(assertLimit(operation)).rejects.toThrow();
});
