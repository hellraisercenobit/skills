export function order() {
  let state: 'draft' | 'submitted' | 'cancelled' = 'draft';
  return {
    submit() {
      if (state !== 'draft') throw new RangeError('Not a draft');
      state = 'submitted';
    },
    cancel() {
      if (state !== 'draft') throw new RangeError('Not a draft');
      state = 'cancelled';
    },
    status: () => state,
  };
}
