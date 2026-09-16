export function watchClicks(button: HTMLButtonElement, onClick: () => void): () => void {
  const controller = new AbortController();
  button.addEventListener('click', onClick, { signal: controller.signal });
  return () => controller.abort();
}
