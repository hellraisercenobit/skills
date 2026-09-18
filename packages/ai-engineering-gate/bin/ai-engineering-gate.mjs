#!/usr/bin/env node
import { main } from '../src/main.mjs';

process.exitCode = main(process.argv.slice(2));
