export function shipping(amount: number): number {
  return amount >= 100 ? 0 : 10;
}
