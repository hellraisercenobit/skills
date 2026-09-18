const INCOMPATIBLE_MODERNIZATION = { id: 'incompatible-modernization', rule: 'TP-12' };
const TARGET_MISMATCH = { id: 'target-mismatch', rule: 'TP-16' };
const WRONG_RUNNER_API = { id: 'wrong-runner-api', rule: 'TP-14' };

export function assessTestingProfile(input) {
  if (needsCompilerProfile(input) && !hasResolvedProfile(input)) {
    return { status: 'incomplete', findings: [] };
  }
  const findings = [];
  if (declaredTargetMismatchesDerived(input)) {
    findings.push(TARGET_MISMATCH);
  }
  if (syntaxExceedsCompiler(input)) {
    findings.push(INCOMPATIBLE_MODERNIZATION);
  }
  if (usesWrongRunnerApi(input)) {
    findings.push(WRONG_RUNNER_API);
  }
  return { status: 'complete', findings };
}

function needsCompilerProfile(input) {
  return input.language === 'typescript' || input.emittedByTsc === true;
}

function hasResolvedProfile(input) {
  return hasEsTarget(input)
    && knownLayer(input.compiler?.version)
    && hasLibLayer(input)
    && knownLayer(input.emit)
    && knownLayer(input.runtime);
}

function hasEsTarget(input) {
  return Boolean(input.compiler?.target) && constraintHasTarget(input.constraints);
}

function hasLibLayer(input) {
  return Array.isArray(input.compiler?.lib) && input.compiler.lib.length > 0;
}

function knownLayer(value) {
  return Boolean(value) && String(value).toLowerCase() !== 'unknown';
}

function declaredTargetMismatchesDerived(input) {
  const declared = constraintEsTarget(input.constraints);
  const derived = normalizeEsTarget(input.compiler?.target);
  return Boolean(declared && derived && declared !== derived);
}

function syntaxExceedsCompiler(input) {
  const version = typescriptVersion(input.compiler?.version);
  if (version === undefined) {
    return false;
  }
  const syntax = input.actual?.syntax ?? [];
  if (syntax.includes('satisfies') && version < 4.9) {
    return true;
  }
  if (syntax.includes('using') && version < 5.2) {
    return true;
  }
  return false;
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

function typescriptVersion(value) {
  const match = String(value ?? '').match(/(\d+)\.(\d+)/);
  if (!match) {
    return undefined;
  }
  return Number(match[1]) + Number(match[2]) / 10;
}
