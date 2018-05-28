const {execFileSync} = require('child_process');
const {join} = require('path');
const {unlinkSync, writeFileSync, readFileSync} = require('fs');
const {edit} = require("@webassemblyjs/wasm-edit");

const cwd = process.cwd();
const emcc = join(cwd, "emsdk", "emscripten", "1.38.1", "emcc");

function transformWasm(bin) {
  return edit(bin, {
    ModuleImport({node}) {
      // Webpack only allows memory and table imports from another wasm
      if (node.name === "memory" || node.name === "table") {
        node.module = "./hack.wat";
      }

      if (node.module === "env" || node.module === "global") {
        node.module = join(cwd, "dist", "loader.js");
      }
    }
  });
}

function readWasm() {
  const b = readFileSync("a.out.wasm", null);
  unlinkSync("a.out.wasm");

  return b;
}

function readLoader() {
  const loader = readFileSync("a.out.js", "utf8");
  unlinkSync("a.out.js");

  return loader;
}

module.exports = function(source) {
  writeFileSync(".tmp.c", source);

  execFileSync(emcc, [
    ".tmp.c",
    // "-O3",
    "-s", "WASM=1",
    "-s", "MODULARIZE=1"
  ]);

  const bin = transformWasm(readWasm());
  this.callback(null, new Buffer(bin));

  this.emitFile("loader.js", readLoader());

  unlinkSync(".tmp.c");
};
