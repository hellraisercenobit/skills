export function parseAmount(input: unknown): number {
  if (typeof input !== 'number' || !Number.isSafeInteger(input) || input < 0) {
    throw new RangeError('Invalid amount');
  }
  return input;
}

export function receipt<const Currency extends string>(currency: Currency, charge: number) {
  return { currency, charge };
}

export type Payment = { kind: 'paid'; cents: number } | { kind: 'declined'; code: string };

export function paymentLabel(payment: Payment): string {
  switch (payment.kind) {
    case 'paid': return `Paid ${payment.cents}`;
    case 'declined': return payment.code;
    default: return payment satisfies never;
  }
}
