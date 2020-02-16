# @wasm-tool/emscripten

> Emscripten loader for webpack

## Installation

```sh
npm i -D @wasm-tool/emscripten
```

## Usage: webpack

Add the loader and mock the `fs` module in your webpack configuration:

```js
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.c$/,
        type: "javascript/auto",
        loader: "@wasm-tool/emscripten"
      }
    ]
  },
  node: {
    fs: "empty"
  },
  // ...
};
```

We need to set the `type` to JavaScript to bypass webpack's wasm support (as a workaround, for now). Which will also prevent the loading to work correclty in non-web environements.

You can then directly import c files:

```js
import("./add.c").then(exports => ...);
```

`emcc` must be available in your `$PATH`, see http://kripken.github.io/emscripten-site/docs/getting_started/downloads.html.
