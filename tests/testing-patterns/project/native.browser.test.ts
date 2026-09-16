import { expect, test } from 'vitest';
import { watchClicks } from './browser.ts';

test('native click subscription stops receiving events after disposal', () => {
  const button = document.createElement('button');
  let clicks = 0;
  const stop = watchClicks(button, () => { clicks++; });
  button.click();
  expect(clicks).toBe(1);
  stop();
  button.click();
  expect(clicks).toBe(1);
});

test('failure-path disposal removes the native listener', () => {
  const button = document.createElement('button');
  let clicks = 0;
  const stop = watchClicks(button, () => { clicks++; });
  expect(() => {
    try {
      button.click();
      throw new Error('Consumer failed');
    } finally { stop(); }
  }).toThrow('Consumer failed');
  button.click();
  expect(clicks).toBe(1);
});

test('native fetch respects a pre-aborted signal', async () => {
  await expect(fetch(location.href, { signal: AbortSignal.abort() })).rejects.toMatchObject({ name: 'AbortError' });
});
