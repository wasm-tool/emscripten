# @wasm-tool/emscripten

> Emscripten loader for Webpack

## Installation

```sh
npm i -D @wasm-tool/emscripten
```

## Usage

Add the loader and mock the `fs` module in your Webpack configuration:

```js
module.exports = {
  // ...
  module: {
    rules: [
      {
        test: /\.c$/,
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

You can then directly import c files:

```js
import("./add.c").then(exports => ...);
```

`emcc` must be available in your `$PATH`, see http://kripken.github.io/emscripten-site/docs/getting_started/downloads.html.
