const INCOMPATIBLE_MODERNIZATION = { id: 'incompatible-modernization', rule: 'MT-23' };
const TARGET_MISMATCH = { id: 'target-mismatch', rule: 'MT-23' };
const WRONG_RUNNER_API = { id: 'wrong-runner-api', rule: 'adapter-family' };

export function assessTestingProfile(input) {
  if (emitsTypeScript(input.language) && !hasResolvedProfile(input)) {
    return { status: 'incomplete', findings: [] };
  }
  const findings = [];
  if (declaredTargetMismatchesDerived(input)) {
    findings.push(TARGET_MISMATCH);
  }
  if (input.actual?.syntax?.includes('satisfies')) {
    findings.push(INCOMPATIBLE_MODERNIZATION);
  }
  if (usesWrongRunnerApi(input)) {
    findings.push(WRONG_RUNNER_API);
  }
  return { status: 'complete', findings };
}

function emitsTypeScript(language) {
  return language === 'typescript' || language === 'javascript';
}

function hasResolvedProfile(input) {
  return hasEsTarget(input) && hasLibLayer(input) && knownLayer(input.emit) && knownLayer(input.runtime);
}

function hasEsTarget(input) {
  return Boolean(input.compiler?.target) && constraintHasTarget(input.constraints);
}

function hasLibLayer(input) {
  if (Array.isArray(input.compiler?.lib) && input.compiler.lib.length > 0) {
    return true;
  }
  return (input.constraints ?? []).some(item => /\blib\b/i.test(item) && /\bes\d+/i.test(item));
}

function knownLayer(value) {
  return Boolean(value) && String(value).toLowerCase() !== 'unknown';
}

function declaredTargetMismatchesDerived(input) {
  const declared = constraintEsTarget(input.constraints);
  const derived = normalizeEsTarget(input.compiler?.target);
  return Boolean(declared && derived && declared !== derived);
}

function usesWrongRunnerApi(input) {
  if (!input.adapterFamily) {
    return false;
  }
  const usesVitestApi = input.actual?.apis?.includes('vi.fn');
  return Boolean(usesVitestApi) && !input.adapterFamily.includes('vitest');
}

function constraintHasTarget(constraints = []) {
  return Boolean(constraintEsTarget(constraints));
}

function constraintEsTarget(constraints = []) {
  for (const item of constraints) {
    const match = item.match(/\btarget\s+(ES\d+)/i);
    if (match) {
      return normalizeEsTarget(match[1]);
    }
  }
  return undefined;
}

function normalizeEsTarget(value) {
  if (!value) {
    return undefined;
  }
  const match = String(value).match(/ES\d+/i);
  return match ? match[0].toUpperCase() : undefined;
}
