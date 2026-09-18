#!/usr/bin/env node
// The generated bundle is what ships and what the hooks run, so the executable runs it too rather than
// the sources beside it: a stale bundle then fails the tests, not only the check.
import { main } from '../dist/ai-engineering-gate.mjs';

process.exitCode = main(process.argv.slice(2));
