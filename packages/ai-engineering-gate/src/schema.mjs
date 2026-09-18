// A JSON Schema 2020-12 subset validator, bundled so the gate carries no runtime dependency.
// It covers the keywords the suite's own schemas use and refuses an unknown keyword rather
// than ignoring it, so a schema this validator cannot enforce is never silently accepted.

const KNOWN = new Set([
  '$schema', '$id', '$defs', '$ref', '$comment', 'title', 'description', 'default', 'examples',
  'type', 'const', 'enum', 'required', 'properties', 'patternProperties', 'additionalProperties',
  'propertyNames', 'dependentRequired', 'items', 'prefixItems', 'minItems', 'maxItems',
  'uniqueItems', 'contains', 'minContains', 'maxContains', 'minLength', 'maxLength', 'pattern',
  'minimum', 'maximum', 'exclusiveMinimum', 'exclusiveMaximum', 'multipleOf',
  'allOf', 'anyOf', 'oneOf', 'not', 'if', 'then', 'else',
]);

const typeOf = value => {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  if (Number.isInteger(value)) return 'integer';
  return typeof value;
};

const typeMatches = (value, expected) => {
  const actual = typeOf(value);
  if (expected === 'number') return actual === 'number' || actual === 'integer';
  if (expected === 'integer') return actual === 'integer';
  return actual === expected;
};

const equals = (a, b) => {
  if (a === b) return true;
  if (typeOf(a) !== typeOf(b)) return false;
  if (Array.isArray(a)) return a.length === b.length && a.every((item, index) => equals(item, b[index]));
  if (a && typeof a === 'object') {
    const keys = Object.keys(a);
    return keys.length === Object.keys(b).length && keys.every(key => equals(a[key], b[key]));
  }
  return false;
};

const resolvePointer = (root, reference) => {
  if (!reference.startsWith('#')) throw new Error(`unsupported schema reference: ${reference}`);
  let node = root;
  for (const raw of reference.slice(1).split('/').filter(Boolean)) {
    const token = decodeURIComponent(raw).replaceAll('~1', '/').replaceAll('~0', '~');
    node = node?.[token];
    if (node === undefined) throw new Error(`unresolved schema reference: ${reference}`);
  }
  return node;
};

const check = (schema, value, path, root, errors) => {
  if (schema === true) return;
  if (schema === false) {
    errors.push({ path, keyword: 'false', message: 'no value is valid here' });
    return;
  }
  for (const keyword of Object.keys(schema)) {
    if (!KNOWN.has(keyword)) throw new Error(`unsupported schema keyword: ${keyword}`);
  }
  if (schema.$ref !== undefined) check(resolvePointer(root, schema.$ref), value, path, root, errors);

  if (schema.type !== undefined) {
    const expected = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!expected.some(one => typeMatches(value, one))) {
      errors.push({ path, keyword: 'type', message: `expected ${expected.join(' or ')}, got ${typeOf(value)}` });
      return;
    }
  }
  if (schema.const !== undefined && !equals(value, schema.const)) {
    errors.push({ path, keyword: 'const', message: `expected ${JSON.stringify(schema.const)}` });
  }
  if (schema.enum !== undefined && !schema.enum.some(one => equals(value, one))) {
    errors.push({ path, keyword: 'enum', message: `expected one of ${JSON.stringify(schema.enum)}` });
  }

  if (typeof value === 'string') {
    if (schema.minLength !== undefined && [...value].length < schema.minLength) {
      errors.push({ path, keyword: 'minLength', message: `shorter than ${schema.minLength}` });
    }
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength) {
      errors.push({ path, keyword: 'maxLength', message: `longer than ${schema.maxLength}` });
    }
    if (schema.pattern !== undefined && !new RegExp(schema.pattern, 'u').test(value)) {
      errors.push({ path, keyword: 'pattern', message: `does not match ${schema.pattern}` });
    }
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push({ path, keyword: 'minimum', message: `below ${schema.minimum}` });
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push({ path, keyword: 'maximum', message: `above ${schema.maximum}` });
    }
    if (schema.exclusiveMinimum !== undefined && value <= schema.exclusiveMinimum) {
      errors.push({ path, keyword: 'exclusiveMinimum', message: `not above ${schema.exclusiveMinimum}` });
    }
    if (schema.exclusiveMaximum !== undefined && value >= schema.exclusiveMaximum) {
      errors.push({ path, keyword: 'exclusiveMaximum', message: `not below ${schema.exclusiveMaximum}` });
    }
    if (schema.multipleOf !== undefined && value % schema.multipleOf !== 0) {
      errors.push({ path, keyword: 'multipleOf', message: `not a multiple of ${schema.multipleOf}` });
    }
  }

  if (Array.isArray(value)) {
    const prefix = schema.prefixItems ?? [];
    prefix.forEach((item, index) => {
      if (index < value.length) check(item, value[index], `${path}/${index}`, root, errors);
    });
    if (schema.items !== undefined) {
      for (let index = prefix.length; index < value.length; index += 1) {
        check(schema.items, value[index], `${path}/${index}`, root, errors);
      }
    }
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push({ path, keyword: 'minItems', message: `fewer than ${schema.minItems} items` });
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push({ path, keyword: 'maxItems', message: `more than ${schema.maxItems} items` });
    }
    if (schema.uniqueItems === true) {
      const duplicate = value.some((item, index) => value.slice(index + 1).some(other => equals(item, other)));
      if (duplicate) errors.push({ path, keyword: 'uniqueItems', message: 'items are not unique' });
    }
    if (schema.contains !== undefined) {
      const matches = value.filter(item => valid(schema.contains, item, root)).length;
      const min = schema.minContains ?? 1;
      if (matches < min) {
        errors.push({ path, keyword: 'contains', message: `fewer than ${min} matching items` });
      }
      if (schema.maxContains !== undefined && matches > schema.maxContains) {
        errors.push({ path, keyword: 'maxContains', message: `more than ${schema.maxContains} matching items` });
      }
    }
  }

  if (value && typeof value === 'object' && !Array.isArray(value)) {
    for (const key of schema.required ?? []) {
      if (!Object.hasOwn(value, key)) {
        errors.push({ path, keyword: 'required', message: `missing property ${key}` });
      }
    }
    const declared = new Set(Object.keys(schema.properties ?? {}));
    for (const [key, child] of Object.entries(schema.properties ?? {})) {
      if (Object.hasOwn(value, key)) check(child, value[key], `${path}/${key}`, root, errors);
    }
    for (const [pattern, child] of Object.entries(schema.patternProperties ?? {})) {
      const expression = new RegExp(pattern, 'u');
      for (const key of Object.keys(value)) {
        if (!expression.test(key)) continue;
        declared.add(key);
        check(child, value[key], `${path}/${key}`, root, errors);
      }
    }
    if (schema.additionalProperties !== undefined) {
      for (const key of Object.keys(value)) {
        if (declared.has(key)) continue;
        if (schema.additionalProperties === false) {
          errors.push({ path: `${path}/${key}`, keyword: 'additionalProperties', message: 'property is not allowed' });
        } else {
          check(schema.additionalProperties, value[key], `${path}/${key}`, root, errors);
        }
      }
    }
    if (schema.propertyNames !== undefined) {
      for (const key of Object.keys(value)) check(schema.propertyNames, key, `${path}/${key}`, root, errors);
    }
    for (const [key, dependents] of Object.entries(schema.dependentRequired ?? {})) {
      if (!Object.hasOwn(value, key)) continue;
      for (const dependent of dependents) {
        if (!Object.hasOwn(value, dependent)) {
          errors.push({ path, keyword: 'dependentRequired', message: `${key} requires ${dependent}` });
        }
      }
    }
  }

  for (const child of schema.allOf ?? []) check(child, value, path, root, errors);
  if (schema.anyOf !== undefined && !schema.anyOf.some(child => valid(child, value, root))) {
    errors.push({ path, keyword: 'anyOf', message: 'matches no allowed alternative' });
  }
  if (schema.oneOf !== undefined) {
    const matches = schema.oneOf.filter(child => valid(child, value, root)).length;
    if (matches !== 1) {
      errors.push({ path, keyword: 'oneOf', message: `matches ${matches} alternatives, expected exactly one` });
    }
  }
  if (schema.not !== undefined && valid(schema.not, value, root)) {
    errors.push({ path, keyword: 'not', message: 'matches a forbidden shape' });
  }
  if (schema.if !== undefined) {
    const branch = valid(schema.if, value, root) ? schema.then : schema.else;
    if (branch !== undefined) check(branch, value, path, root, errors);
  }
};

const valid = (schema, value, root) => {
  const errors = [];
  check(schema, value, '', root, errors);
  return errors.length === 0;
};

// Returns the empty array when the value conforms, or every violation as `<path>: <message>`.
export function schemaErrors(schema, value) {
  const errors = [];
  check(schema, value, '', schema, errors);
  return errors.map(error => `${error.path || '/'}: ${error.message}`);
}
