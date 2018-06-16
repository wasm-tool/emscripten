const {execFileSync} = require('child_process');
const {join} = require('path');
const {unlinkSync, writeFileSync, readFileSync} = require('fs');
const {editWithAST} = require("@webassemblyjs/wasm-edit");
const {decode} = require("@webassemblyjs/wasm-parser");
const wabt = require("wabt");
const t = require("@webassemblyjs/ast");

const emcc = "emcc";

const decoderOpts = {
  ignoreCodeSection: true,
  ignoreDataSection: true,
  ignoreCustomNameSection: true
};

function wast2wasm(str) {
  const module = wabt.parseWat("hack.wat", str);
  const { buffer } = module.toBinary({});

  return buffer.buffer;
}

function inspect(ast) {
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

function transformWasm(ast, bin) {
  return editWithAST(ast, bin, {

    // FIXME(sven): fix https://github.com/webpack/webpack/issues/7454
    Elem({node}) {
      const offset = t.objectInstruction("const", "i32", [
        t.numberLiteralFromRaw(0)
      ]);

      node.offset = [offset];
    },

    ModuleImport({node}) {

      // Webpack only allows memory and table imports from another wasm
      if (node.name === "memory" || node.name === "table") {
        node.module = "/tmp/hack.wasm";
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
const generateHackWasm = info => wast2wasm(`
  (module
    (memory (export "memory") ${info.memory.min} ${info.memory.max})
    (table (export "table") ${info.table.min} ${info.table.max} anyfunc)
  )
`);

module.exports = function(source) {
  writeFileSync(".tmp.c", source);

  execFileSync(emcc, [
    ".tmp.c",
    // "-O3",
    "-s", "WASM=1",
    "-s", "MODULARIZE=1"
  ]);

  let bin = readWasm();

  const ast = decode(bin, decoderOpts);
  const info = inspect(ast);

  bin = transformWasm(ast, bin);

  writeFileSync("/tmp/module.wasm", new Buffer(bin));
  writeFileSync("/tmp/loader.js", readLoader());

  writeFileSync("/tmp/hack.wasm", new Buffer(generateHackWasm(info)));
  writeFileSync("/tmp/wasm-loader.js", generateWasmWrapperLoader());

  this.callback(null, generateUserWrapperLoader(info.exports));

  unlinkSync(".tmp.c");
};
