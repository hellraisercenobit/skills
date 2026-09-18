export function detectTestingAdapter(evidence) {
  const codeceptionVersion = evidence?.composerPackages?.['codeception/codeception'];
  if (codeceptionVersion) {
    return {
      family: 'codeception',
      adapter: 'transpose-codeception.md',
      complete: true,
      profile: { runner: 'codeception', version: codeceptionVersion },
    };
  }
  const vitestVersion = evidence?.npmPackages?.vitest;
  if (vitestVersion) {
    return {
      family: 'vitest',
      adapter: 'transpose-vitest.md',
      complete: true,
      profile: { runner: 'vitest', version: vitestVersion },
    };
  }
  return {
    family: 'unknown',
    adapter: null,
    complete: false,
    profile: { runner: 'unknown', version: null },
  };
}
