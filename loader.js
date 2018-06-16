const {execFileSync} = require('child_process');
const {join} = require('path');
const {unlinkSync, writeFileSync, readFileSync} = require('fs');
const {edit} = require("@webassemblyjs/wasm-edit");
const {decode} = require("@webassemblyjs/wasm-parser");
const t = require("@webassemblyjs/ast");

const cwd = process.cwd();
const emcc = join(cwd, "emsdk", "emscripten", "1.38.1", "emcc");

function inspect(bin) {
  // FIXME(sven): pass decoderOptions
  const ast = decode(bin);

  const exports = [];
  const memory = {};
  const table = {};

  t.traverse(ast, {

    ModuleExport({ node }) {
      exports.push(node.name);
    },

    Table({ node }) {
      table.min = node.limits.min;
      table.max = node.limits.max;
    },

    Memory({ node }) {
      memory.min = node.limits.min;
      memory.max = node.limits.max;
    }

  });

  return { memory, table, exports };
}

function transformWasm(bin) {
  // FIXME(sven): use editWithAst
  return edit(bin, {
    Elem({node}) {
      const offset = t.objectInstruction("const", "i32", [
        t.numberLiteralFromRaw(0)
      ]);

      node.offset = [offset];
    },

    ModuleImport({node}) {

      // Webpack only allows memory and table imports from another wasm
      if (node.name === "memory" || node.name === "table") {
        node.module = "/tmp/hack.wat";
      }

      if (node.module === "env" || node.module === "global") {
        node.module = "/tmp/wasm-loader.js";
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

/**
 * Loader being imported by the wasm module
 */
const generateWasmWrapperLoader = () => `
  const Module = require("/tmp/loader.js");

  const m = new Module({
    wasmBinary: true,
    instantiateWasm: (info, receiveInstance) => {
      receiveInstance({ exports: true });
      return true;
    }
  });

  module.exports = m.asmLibraryArg;
`;

/**
 * Loader being imported by the user
 */
const generateUserWrapperLoader = (exportNames) => `
  import Module from "/tmp/loader.js";
  import * as instanceExports from "/tmp/module.wasm";

  const m = new Module({
    wasmBinary: true,
    instantiateWasm: (info, receiveInstance) => {
      receiveInstance({ exports: instanceExports });
      return instanceExports;
    }
  });

  ${exportNames.map(
    name => "export const " + name + " = instanceExports." + name
  ).join(";")}

  export default m;
`;

/**
 * Memory and table being imported by the wasm module
 */
const generateHackWat = info => `
  (module
    (memory (export "memory") ${info.memory.min} ${info.memory.max})
    (table (export "table") ${info.table.min} ${info.table.max} anyfunc)
  )
`;

module.exports = function(source) {
  writeFileSync(".tmp.c", source);

  execFileSync(emcc, [
    ".tmp.c",
    // "-O3",
    "-s", "WASM=1",
    "-s", "MODULARIZE=1"
  ]);

  const bin = transformWasm(readWasm());
  const info = inspect(bin);

  writeFileSync("/tmp/module.wasm", new Buffer(bin));
  writeFileSync("/tmp/loader.js", readLoader());

  writeFileSync("/tmp/hack.wat", generateHackWat(info));
  writeFileSync("/tmp/wasm-loader.js", generateWasmWrapperLoader());

  this.callback(null, generateUserWrapperLoader(info.exports));

  unlinkSync(".tmp.c");
};
