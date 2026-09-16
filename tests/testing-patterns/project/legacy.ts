export function legacyLabel(name: string): string {
  let value = name.trim();
  if (value === '') value = 'anonymous';
  return value.toUpperCase();
}
