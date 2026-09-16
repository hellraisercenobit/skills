export function serial() {
  let tail: Promise<unknown> = Promise.resolve();
  return {
    run<T>(action: () => Promise<T>): Promise<T> {
      const result = tail.then(action, action);
      tail = result.catch(() => undefined);
      return result;
    },
  };
}
export function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) { reject(signal.reason); return; }
    const abort = () => {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', abort);
      resolve();
    }, milliseconds);
    signal.addEventListener('abort', abort, { once: true });
  });
}

export function expired(deadline: number, now: () => number): boolean {
  return now() >= deadline;
}
