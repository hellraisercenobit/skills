export function startOperation(target, onEvent, url) {
  const controller = new AbortController();
  const { signal } = controller;
  const finished = (async () => {
    try {
      target.addEventListener("tick", event => onEvent(event), { signal });
      const response = await fetch(url, { signal });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      return signal.aborted ? { status: "aborted" } : { status: "ok", text };
    } catch (error) {
      if (signal.aborted && error?.name === "AbortError") return { status: "aborted" };
      throw error;
    } finally {
      controller.abort();
    }
  })();
  return { finished, dispose: () => controller.abort() };
}
