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

const realArgv = process.argv.slice();
// --loader loses the application part (last arg) in argv. sigh.
realArgv.splice(1, 0, ...process.execArgv);

// make a guess what we should do based on execArgv
// N.B. this ignores the possibility that it was specified as --loader=file.mjs.
// handle that once the other issues are sorted out.
const isImport = process.execArgv.includes('--import');
const isLoader = process.execArgv.some(l => l === '--loader' || l === '--experimental-loader');
// if neither --loader nor --import is specified it's an error to be executing
// this file.
if (!isLoader && !isImport) {
  throw new Error('esm-compat-loader.mjs should not be the entry point for the agent');
}

const origCompile = Module.prototype._compile;
const origJsExtension = Module._extensions['.js'];

// some simple config stuff.
const ourcode = path.dirname(fileURLToPath(import.meta.url));
const exclude = (pathname) => pathname.startsWith(ourcode);
const openPorts = false;
const is20_6 = semver.gte(process.version, '20.6.0');
const repo = path.dirname(ourcode);

// if both were specified, we're just going to ignore --loader, isImport controls.
// if --import and node >= 20.6.0, it handles required files, so
// no need to patch require too (afaict).
if (!process.env.DO_NOT_PATCH_REQUIRE && isImport && is20_6) {
  process.env.DO_NOT_PATCH_REQUIRE = true;
}

if (!process.env.DO_NOT_PATCH_REQUIRE) {
  console.log('[patching require()]');
  function patchedCompile(content, filename) {
    const m = `[--require() ${filename}]`;
    console.log(m);

    if (exclude(filename)) {
      return origCompile.call(this, content, filename);
    }

    const basename = path.basename(filename);
    const stuffToAdd = `const xyzzy = global.__xyzzy ||
        (() => {throw new Error("${basename} can't see __xyzzy")})();
        console.log("${basename} sees __xyzzy as", xyzzy);
        `;
    let msg;
    try {
      // rewrite content/filename. rewritten is {code, map} as
      // returned from babel.
      msg = 'error rewriting code';
      const rewritten = {
        code: content + stuffToAdd,
      };


      msg = 'error compiling rewritten code';
      const compiled = origCompile.call(this, rewritten.code, filename);

      return compiled;
    } catch (err) {
      msg = `${msg}; using original code`;
      console.error('ERROR', { msg, filename, err });
    }
    // if it failed just try to compile the original content.
    return origCompile.call(this, content, filename);
  }

  if (origCompile !== patchedCompile) {
    Module.prototype._compile = patchedCompile;
    Module._extensions['.js'] = function(module, filename) {
      const cached = undefined;

      // if cached skip _extensions method and go straight to compile
      if (cached) {
        return origCompile.call(module, cached, filename);
      } else {
        return origJsExtension.call(this, module, filename);
      }
    };
  }
}

let registerOptions = {};

// only set to a defined value if --loader
let _load = undefined;

// node >= 20.6.0: register the loader; --import doesn't work the same
// as --loader (which expects that the loader is just a module that exports
// loader functions).
if (is20_6 && isImport) {
  // the code here to set up the message channel does not seem necessary at
  // this time, but i'm keeping it in in case we discover a need for it.
  let mainPort;
  if (openPorts) {
    const { port1: ourPort, port2: hooksPort } = new MessageChannel();
    registerOptions.data = {hooksPort};
    registerOptions.transferList = [hooksPort];
    ourPort.on('message', (msg) => {
      console.log('msg:', msg);
    });
    ourPort.on('close', () => {
      console.log('message channel closed');
    });
    mainPort = ourPort;
  }
  // fragile - needs to base on root at load time...
  register('./dist/esm-loader-v20-6.mjs', pathToFileURL('./'), registerOptions);
  // if this is not unref'd the process will not exit.
  mainPort?.unref();
} else {
  // it's less than 20.6.0 and register() does not exist, so use the old
  // style of exporting the hook functions. this approach issues a warning
  // and requires globalPreload(), which is already deprecated, to work.
  _load = load;
}

//
// it's ugly, but if we're using --loader the underscored variables are
// defined as the function below, and if we're using --import, they're
// undefined. before node 20.0.1, globalPreload was not needed but i don't
// think it hurts to define it.
//
export { _load as load };

//
// This function gets called only if this is being invoked via --loader. If not,
// the export is undefined.
//
async function load(url, context, nextLoad) {
  const {format} = context;

  if (format === 'builtin') {
    return nextLoad(url, context);
  }

  const filename = fileURLToPath(url);

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

  const m = `[--loader load(): ${filename.replace(repo, '')} (${format})]`;
  console.debug(m);

  let msg;
  try {
    console.log(`[--loader patching ${filename} format=${format}]`);

    msg = 'error reading file';
    const source = await fsp.readFile(filename, 'utf8');
    // this is exactly the same as `source` on the previous line; is it documented anywhere
    // that calling nextLoad() returns the contents of `url`?
    //const { source: rawSource } = await nextLoad(url, {...context, format: context.format || format }, nextLoad);

    const basename = path.basename(filename);

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
