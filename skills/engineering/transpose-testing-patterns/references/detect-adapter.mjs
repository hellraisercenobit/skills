import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export function inspectProject(root) {
  const evidence = { npmPackages: {}, composerPackages: {} };
  const pkgPath = join(root, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    Object.assign(evidence.npmPackages, pkg.dependencies ?? {}, pkg.devDependencies ?? {});
    evidence.npmScripts = pkg.scripts;
  }
  const composerPath = join(root, 'composer.json');
  if (existsSync(composerPath)) {
    const composer = JSON.parse(readFileSync(composerPath, 'utf8'));
    Object.assign(evidence.composerPackages, composer.require ?? {}, composer['require-dev'] ?? {});
  }
  evidence.hasCodeceptionConfig = existsSync(join(root, 'codeception.yml'));
  evidence.hasKarmaConfig = ['karma.conf.js', 'karma.conf.ts'].some(name => existsSync(join(root, name)));
  evidence.hasAngularProject = existsSync(join(root, 'angular.json'))
    || Boolean(evidence.npmPackages['@angular/core']);
  return detectTestingAdapter(evidence);
}

export function detectTestingAdapter(evidence) {
  const codeceptionVersion = evidence?.composerPackages?.['codeception/codeception'];
  if (codeceptionVersion) {
    const major = packageMajor(codeceptionVersion);
    const known = major === 4 || major === 5;
    const profile = { runner: 'codeception', version: codeceptionVersion };
    if (evidence.hasCodeceptionConfig !== undefined) {
      profile.hasConfig = evidence.hasCodeceptionConfig;
    }
    if (!known) {
      profile.unknowns = ['codeception-major'];
    }
    return {
      family: 'codeception',
      adapter: 'transpose-codeception.md',
      complete: known,
      profile,
    };
  }
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
    const unknowns = [];
    if (packageMajor(profile.angular) !== 10 && packageMajor(profile.angular) !== 11) {
      unknowns.push('angular-major');
    }
    if (packageMajor(profile.karma) !== 6) {
      unknowns.push('karma-major');
    }
    if (packageMajor(profile.jasmineCore) !== 3) {
      unknowns.push('jasmine-major');
    }
    if (unknowns.length > 0) {
      profile.unknowns = unknowns;
    }
    return {
      family: 'karma-jasmine-angular',
      adapter: 'transpose-karma-jasmine-angular.md',
      complete: unknowns.length === 0,
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

function packageMajor(version) {
  const match = String(version).match(/\d+/);
  return match ? Number(match[0]) : undefined;
}
