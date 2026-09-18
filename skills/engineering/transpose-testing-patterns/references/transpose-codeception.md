# Codeception adapter 1.0.0

Read alongside the applicable catalog rules. Identity is **Codeception**: any installed
`codeception/codeception` the lockfile reports. This is not "Codeception 5.0 only" and not
generic PHPUnit. Detect the profile from the lockfile, `codeception.yml` / suite files,
installed PHPUnit, and the command the project actually runs. Record Codeception major/minor,
suite types (Unit/Cest/Functional/Acceptance), DB/transaction helpers, group filters and
command. Do not key routing on an exact `5.0.0` string.

A first **reference profile** pins Codeception 5.x Unit tests that talk to MySQL through
`public UnitTester $tester` transactions. That profile is a qualification target, not an
adoption pin and not a requirement that every Codeception project look like Unit+MySQL.
A project without MySQL, without `@group`, or with a different `codecept` invocation still
uses this adapter; the freeze records what is actually there.

Sources checked 2026-09-18; verify support again for a different installed profile.
Unknown or undocumented Codeception/PHPUnit majors are incomplete execution, or use the
conservative mappings below with named unknowns. Never treat PHP as close enough to Vitest.

## Detect and route

If `codeception/codeception` is present, load this adapter. Patch, minor and major differences
stay in the capability table. Do not fall back to catalog-only because the version is not 5.0,
and do not silently migrate to Vitest.

| Detected fact | Record when present | Do not invent |
| --- | --- | --- |
| Lockfile `codeception/codeception` | major/minor (4.x, 5.0.x, 5.1.x and other installed ids) | an exact 5.0.0 pin |
| Suite type | Unit, Cest, Functional, Acceptance from config/paths | Unit+MySQL for a pure Acceptance suite |
| `UnitTester` + `startTransaction` / `endTransaction` | DB isolation on `$this->tester` | a jsdom or "pure unit" claim |
| `@group` / CI filter | TP-16 execution filter | a group rule the project does not use |
| Actual invocation | compose, `vendor/bin/codecept`, CI image | a guessed `codecept` path |
| `Codeception\\Stub` and PHPUnit doubles | APIs on the installed pair | `vi.fn<(...)>()` |
| `loadMfb` / `getLegacyController` | existing entry to legacy controllers | a new port |
| `getDefaultAccountId` / `tests/resources/modelHelper` | project helpers that exist | those helpers on a project that lacks them |

## Capability table

Map each TP family from **profile predicates**, not from a single frozen 5.0 column.

| Catalog families | Profile predicate | Transposition |
| --- | --- | --- |
| TP-01/02/06/15 | Cest or Unit methods exist | Direct methods, explicit assertions. Snapshots unavailable unless the profile already has a snapshot tool |
| TP-03/04/08/10 | `Codeception\\Stub` / PHPUnit doubles on the installed pair | Those doubles at the chosen seam. No Vitest generics. Module-mock hoisting unavailable |
| TP-05 | A PHP property library is already in the lockfile | Use that library. Otherwise unavailable; do not add `fast-check` |
| TP-07/16 | Detected invocation and, when configured, `@group` / CI filters | Recorded command = actual command. Absence of a group filter is not a finding |
| TP-09 | A project helper is present in the suite | Use that helper. If none exists, do not invent `getDefaultAccountId` or `modelHelper` |
| TP-11 | An existing entry is present | Use that entry. If `loadMfb` / `getLegacyController` are absent, do not invent a port |
| TP-12 | PHP | Unavailable. No `expectTypeOf` |
| TP-13 | PHPUnit/Codeception teardown | Teardown hooks and, when present, DB transaction lifecycle. No JS fake timers |
| TP-14 | Suite actor / DB | Environment from the suite. MySQL when the Unit tester uses it; otherwise the suite's actor. `Codeception\\Test\\Unit` does not automatically mean no I/O |

## Isolation and environment

When the profile uses `$this->tester` plus transactions against a database, isolation is
that transaction lifecycle, not a mocked database under a Unit class name. Recale "pure
unit", jsdom and Vitest Browser Mode claims. A Unit path that talks to MySQL is still this
adapter; name the remaining integration risk.

Account identity and model helpers belong only when those symbols exist. Legacy `app/`
controllers belong only through the existing `loadMfb()` / `getLegacyController()` entry.

## Doubles and errors

Use `Codeception\\Stub` and the PHPUnit doubles that ship with `Codeception\\Test\\Unit` on
the installed pair. Keep the seam honest: a stub is not a fake, and a fake's policy needs
its own owner. Do not emit `vi.fn`, `vi.spyOn`, `vi.mocked`, `test.extend` or hoisted
`vi.mock`.

Error recipes must reject a wrong class with the same message, a missing exception and an
accidental error. Message matching alone does not establish class. Inspect one observed
failure instead of invoking a stateful action twice.

## Commands and builder limits

RED/GREEN must use the project's actual invocation, for example
`docker compose run --rm --no-deps -T cli vendor/bin/codecept run --no-colors <path>` when
that is what CI or the worktree runs. Do not invent a local `vendor/bin/codecept` if the
project never uses it. Map required scenarios to executed test identities. Honor `@group`
filters when CI actually applies them.

Never copy Vitest `test.extend`, `vi.fn`, `expectTypeOf`, snapshots or `fast-check` into
PHP tests. Catalog families stay runner-neutral; this adapter chooses APIs from the detected
profile only.
