
# patch-o-matic

it's just a playground for working with how to rewrite modules using different
versions of node.

# how to use

```bash
$ npm install

npm run $ONE_OF_THE_SCRIPTS_IN_PACKAGE_JSON
```

# SCRIPTS_IN_PACKAGE_JSON

The primary problem that I'm faced with is that I cannot ignore a .node file when it appears
in the load() function, whether using --loader or --import. This just works when using require-
patching.

The secondary issue is the reason for the "segfault" scripts - they just document the reproducible
segfault. The binary that causes the segfault is written in rust and uses napi-rs; I'm guessing that
there might be some cleanup that causes the problem; my next step is to walk through the C++ code with
gdb to see if I can find the problem.

But I'm guessing/hoping that, if the --loader and --import options are fixed to handle .node files, that the
problem will go away.

## script that modifies module.prototype._compile
- `req-loader-js` shows that executing user-app.js with the require-based loader works

## scripts that use the --loader option
- `esm-loader-js` shows that executing user-app.js segfaults on a specific .node file
- `esm-loader-mjs` shows that executing user-app.mjs segfaults on a specific .node file
- `esm-loader-js-no-segfault` shows executing user-app.js does not segfault with a different .node file
- `esm-loader-mjs-no-segfault` shows executing user-app.mjs does not segfault with a different .node file

## scripts that use the --import option (only active with node >= 20.6.0)
- `esm-import-js` shows that executing user-app.js segfaults on a specific .node file
- `esm-import-mjs` shows that executing user-app.mjs segfaults on a specific .node file
- `esm-import-js-no-segfault` shows executing user-app.js does not segfault with a different .node file
- `esm-import-mjs-no-segfault` shows executing user-app.mjs does not segfault with a different .node file

# limitations

This is only tested using linux.
