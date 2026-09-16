export function* pages(count: number, produced: (value: number) => void, close: () => void) {
  try {
    for (let value = 0; value < count; value++) {
      produced(value);
      yield value;
    }
  } finally { close(); }
}
