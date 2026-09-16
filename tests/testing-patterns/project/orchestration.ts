import { shipping } from './domain.ts';

export async function checkout(amount: number, send: (receipt: { total: number }) => Promise<void>) {
  await send({ total: amount + shipping(amount) });
}
