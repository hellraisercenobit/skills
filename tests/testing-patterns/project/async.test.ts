import { afterEach, expect, test, vi } from 'vitest';
import { delay, expired, serial } from './async.ts';

test('overlapping requests never enter the protected effect together', async () => {
  const queue = serial();
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  let active = 0;
  let peak = 0;
  const first = queue.run(async () => {
    active++;
    peak = Math.max(peak, active);
    entered.resolve();
    await release.promise;
    active--;
  });
  await entered.promise;
  const second = queue.run(async () => {
    active++;
    peak = Math.max(peak, active);
    active--;
  });
  release.resolve();
  await Promise.all([first, second]);
  expect(peak).toBe(1);
  expect(active).toBe(0);
});

test('a failed effect releases the next request', async () => {
  const queue = serial();
  await expect(queue.run(async () => { throw new Error('failed'); })).rejects.toThrow('failed');
  await expect(queue.run(async () => 42)).resolves.toBe(42);
});
afterEach(() => { vi.useRealTimers(); });

test('business time crosses the inclusive expiration boundary', () => {
  let now = 99;
  expect(expired(100, () => now)).toBe(false);
  now = 100;
  expect(expired(100, () => now)).toBe(true);
});

test('scheduler cancellation rejects and removes the scheduled task', async () => {
  vi.useFakeTimers();
  const controller = new AbortController();
  const pending = delay(100, controller.signal);
  const timerCount = vi.getTimerCount();
  controller.abort('cancelled');
  await expect(pending).rejects.toBe('cancelled');
  expect(timerCount).toBe(1);
  expect(vi.getTimerCount()).toBe(0);
});

test('scheduler resolves only at its deadline and handles pre-aborted input', async () => {
  vi.useFakeTimers();
  let completed = false;
  const pending = delay(100, new AbortController().signal).then(() => { completed = true; });
  await vi.advanceTimersByTimeAsync(99);
  expect(completed).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await pending;
  expect(completed).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  await expect(delay(100, AbortSignal.abort('already cancelled'))).rejects.toBe('already cancelled');
  expect(vi.getTimerCount()).toBe(0);
});
