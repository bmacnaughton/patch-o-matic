import {fileURLToPath} from 'node:url';
import {promises as fsp} from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';

const repo = fileURLToPath(new URL('../', import.meta.url));
//
// This function gets called only if this is being invoked via --loader. If not,
// the export is undefined.
//
export async function load(url, context, nextLoad) {
  const {format} = context;

  if (format === 'builtin') {
    return nextLoad(url, context);
  }

  const filename = fileURLToPath(url);

  if (format !== 'commonjs' && format !== 'module') {
    console.debug({ load: url, format }, 'Skipping rewrite; loading original code');
    return nextLoad(url, context);
  }

  const m = `[--loader load(): ${filename.replace(repo, '')} (${format})]`;
  console.debug(m);

  let msg;
  try {
    console.log(`[--loader patching ${filename} format=${format}]`);

    // fake rewrite by just reading the file and supplying it as source.
    msg = 'error reading file';
    const source = await fsp.readFile(filename, 'utf8');

    return {
      format,
      source,
      shortCircuit: true,
    };
  } catch (err) {
    msg = `${msg}; using original code`;
    console.error({ msg, filename, err });

    return nextLoad(url, context, nextLoad);
  }
}
