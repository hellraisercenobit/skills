---
name: transpose-design-pattern
description: Select a design pattern from a built-in framework-agnostic catalog and transpose it to the target framework via a bundled per-framework guide, BEFORE writing implementation code. USE WHEN implementing or refactoring code with a pattern-shaped decision - interchangeable behaviors, plugin/extensibility, object-creation logic, DTO/API-shape mapping, shared state, composable actions, cross-cutting concerns - or when choosing where code goes or whether a design is sound. EXAMPLES - "add a new exporter type", "wire two payment providers via DI", "where should this DTO mapping live", "make this service pluggable", "Strategy or Registry here?".
license: MIT
author: Guillaume Mongin (@hellraisercenobit)
---

# Transpose Design Pattern

Autonomous, portable, **mandatory** workflow: pick a pattern from the built-in catalog, then transpose
it to the target framework using a bundled guide — **before** writing implementation code. Everything
this skill needs ships inside it; it references **no project files**, so it works in any repository.

## Bundled sources (this skill owns them — read, do not paraphrase from memory)

- **Catalog (framework-agnostic):** [`references/pattern-catalog.md`](references/pattern-catalog.md)
- **Transposition (per framework):** the guide from the table below.

| Target framework  | Transposition guide                                                  | Store / shared state         |
| ----------------- | ------------------------------------------------------------------- | ---------------------------- |
| Angular           | [`references/transpose-angular.md`](references/transpose-angular.md) | `providedIn: 'root'` service / `@ngrx/signals` |
| React             | [`references/transpose-react.md`](references/transpose-react.md)     | Zustand                      |
| Vue               | [`references/transpose-vue.md`](references/transpose-vue.md)         | Pinia (setup store)          |
| Vanilla TS (none) | [`references/transpose-vanilla.md`](references/transpose-vanilla.md) | closure observable store / signals |
| Quarkus (Java)    | [`references/transpose-quarkus.md`](references/transpose-quarkus.md) | `@ApplicationScoped` CDI bean |

> Determine the target framework from the project you are editing — `package.json` deps for the JS/TS
> frameworks (no UI framework → Vanilla TS), or a `pom.xml` / `build.gradle` declaring `io.quarkus`
> deps → Quarkus. To support another, see _Extending to a new framework_.

## Mandatory procedure

Run **every** step before writing or changing implementation code. Do not jump straight to coding.

1. **Spot the decision.** Name the pattern-shaped need: interchangeable behaviors, plugin/extensibility,
   object-creation logic, DTO/API-shape mismatch, shared app state, composable action, or a cross-cutting
   concern. If none applies, say so explicitly and proceed without forcing a pattern.
2. **Select the pattern.** Match the need against the _Decision Rules_ table in `references/pattern-catalog.md`;
   read that pattern's _Use when / Best practices / Avoid_ section.
3. **Resolve the framework.** Look up the transposition guide in the table above.
4. **Transpose.** Read the matching section in that guide (plus its _Decision Matrix_) and apply the
   framework wiring exactly — DI, signals, stores, layering.
5. **Apply & justify.** Implement per the transposition. In your summary, state the chain
   _need → pattern → framework section followed_, **and for each pattern name the concrete artifact**
   (file + symbol) that realizes it. Verify the artifact is **distinct from unrelated layers** — e.g. a
   Command/use-case is its own injectable or exported function, **not** a method merged into a store/facade.

## Framework transposition — step 4

Every guide uses the **same section names** (Strategy, Registry, Factory, Command, Adapter / DTO Mapping,
Composition, Singleton / shared state), so open the section matching your pattern. For
reactivity / async / forms, read that guide's _Cross-cutting <framework> practice_ section; for anything
else, its _Decision Matrix_ (bottom). Store choice per framework is in the _Bundled sources_ table above.

## Enforcement rules

- Steps 1–4 are **non-negotiable** before implementation code in pattern-shaped work.
- Never invent a pattern absent from the catalog. Never use `switch` / `constructor.name` / magic strings
  where the catalog marks them _Avoid_.
- Treat each pattern's _Avoid_ clause as a hard rule — e.g. do **not** fold a reusable Command into a
  store/facade method; resolve plugins by key via a Registry, never `switch` on a type tag.
- Keep business logic framework-agnostic — only the transposition step (4) is framework-specific.
- The bundled references are the source of truth. If a project also has its own pattern docs, follow the
  project doc for project-specific wiring, but the procedure above still applies.

## Extending to a new framework

1. Author `references/transpose-<framework>.md`, mirroring `references/transpose-angular.md`: a
   _Decision Matrix_ plus one section per catalog pattern with idiomatic wiring for that framework.
2. Add one row to the _Target framework_ table above, pointing at the new guide.
3. Leave `references/pattern-catalog.md` framework-agnostic and unchanged — it is shared across all targets.
