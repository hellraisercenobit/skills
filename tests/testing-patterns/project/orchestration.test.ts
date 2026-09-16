import { expect, test, vi } from 'vitest';
import { checkout } from './orchestration.ts';

test('checkout sends one receipt with the real shipping policy applied', async () => {
  const send = vi.fn<(receipt: { total: number }) => Promise<void>>().mockResolvedValue(undefined);
  await checkout(99, send);
  expect(send.mock.calls).toEqual([[{ total: 109 }]]);
});
