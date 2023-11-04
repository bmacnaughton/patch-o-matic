import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { promises as fsp } from 'node:fs';
import { MessageChannel } from 'node:worker_threads';
import path from 'node:path';
import semver from 'semver';

global.__xyzzy = 'my__xyzzy';

// the import statement cannot deal with optional exports, e.g.,
// register is not present until node 20.6.0. the code below does
// not reference register unless the version is >= 20.6.0.
const mObject = await import('node:module');
const { default: Module, register } = mObject;

let registerOptions = {};

// fragile - needs to base on root at load time...
register('./dist/esm-loader-v20-6.mjs', pathToFileURL('./'), registerOptions);
// if this is not unref'd the process will not exit.
