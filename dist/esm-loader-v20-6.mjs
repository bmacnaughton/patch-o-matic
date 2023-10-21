/*
 * This file contains the loader that is used as an argument to register() for
 * node >= 20.6.0.
 */
debugger;

import { promises as fsp } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import path from 'node:path';

const esmConfig = {};
export { esmConfig as config };

// keep stats
const stats = {
  skipped: 0,
  rewritten: 0,
};

export function getStats() {
  return stats;
}

let port;
export async function initialize(obj) {
  console.log('initialized() called')
  obj?.hooksPort.postMessage('initialized');
  port = obj?.hooksPort;
}

export async function resolve(specifier, context, nextResolve) {
  console.log(`[--import resolve() ${specifier}]`);
  return nextResolve(specifier);
}

export async function load(url, context, nextLoad) {
  const { format } = context;
  port?.postMessage({ load: url, format });
  const filename = url.startsWith('file://') ? fileURLToPath(url) : url;
  console.log(`[--import register() hook, ${filename}]`);

  if (format !== 'commonjs' && format !== 'module') {
    console.debug({ load: url, format }, 'Skipping rewrite; loading original code');
    // new hack start
    if (path.extname(filename) === '.node') {
      const req = createRequire(import.meta.url);
      const m = req(filename);
      return { format, source: m, shortCircuit: true };
    }
    // new hack end
    return nextLoad(url, context);
  }

  let msg;
  try {
    console.log(`[--import register() patching ${filename} format=${format}}]`);
    msg = 'error reading file';
    const source = await fsp.readFile(filename, 'utf8');
    // this is exactly the same as `source` on the previous line; is it documented anywhere
    // that calling nextLoad() returns the contents of `url`?
    //const { source: rawSource } = await nextLoad(url, {...context, format: context.format || type }, nextLoad);

    const basename = path.basename(filename);
    return { format: format, source: stuffToAdd + source, shortCircuit: true };
  } catch (err) {
    msg = `${msg}; using original code`;
    console.error({ msg, filename, err });

    return nextLoad(url, context, nextLoad);
  }
}
