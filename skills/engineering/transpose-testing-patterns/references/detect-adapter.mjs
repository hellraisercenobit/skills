export function detectTestingAdapter(evidence) {
  const npmPackages = evidence.npmPackages ?? {};
  if (
    evidence.hasKarmaConfig &&
    evidence.hasAngularProject &&
    npmPackages.karma &&
    npmPackages['jasmine-core'] &&
    npmPackages['@angular/core']
  ) {
    const profile = {
      angular: npmPackages['@angular/core'],
      karma: npmPackages.karma,
      jasmineCore: npmPackages['jasmine-core'],
    };
    if (npmPackages.typescript) {
      profile.typescript = npmPackages.typescript;
    }
    return {
      family: 'karma-jasmine-angular',
      adapter: 'transpose-karma-jasmine-angular.md',
      complete: true,
      profile,
    };
  }
  if (npmPackages.vitest) {
    return {
      family: 'vitest',
      adapter: 'transpose-vitest.md',
      complete: true,
      profile: { vitest: npmPackages.vitest },
    };
  }
  return {
    family: 'unknown',
    adapter: null,
    complete: false,
    profile: {},
  };
}
