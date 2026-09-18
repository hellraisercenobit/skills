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

function packageMajor(version) {
  const match = String(version).match(/\d+/);
  return match ? Number(match[0]) : undefined;
}
