const Module = require('module');
const path = require('path');

const origCompile = Module.prototype._compile;
const origJsExtension = Module._extensions['.js'];

const ourcode = path.dirname(__filename);
function exclude(filename) {
  return filename.startsWith(ourcode);
}

function patchedCompile(content, filename) {
  const m = `[--require() ${filename}]`;
  console.log(m);

  if (exclude(filename)) {
    return origCompile.call(this, content, filename);
  }

  const basename = path.basename(filename);

  let msg;
  try {
    // rewrite content/filename. rewritten is {code, map} as
    // returned from babel.
    msg = 'error rewriting code';
    const rewritten = {
      code: content,
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
