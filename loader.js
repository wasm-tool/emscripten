const { execFileSync } = require("child_process");
const { join, basename } = require("path");
const {
  existsSync,
  mkdirSync,
  writeFileSync,
  readFileSync
} = require("fs");
const { tmpdir } = require("os");
const loaderUtils = require("loader-utils");

const emcc = "emcc";

function createTempDir() {
  const path = join(tmpdir(), "wasm-tool-emscripten");
  if (!existsSync(path)) {
    mkdirSync(path);
  }
  return path;
}

function runEmcc(cwd, main) {
  const args = [main, "-O3", "-s", "WASM=1", "-s", "MODULARIZE=1"];
  const options = { cwd };
  return execFileSync(emcc, args, options);
}

module.exports = function(source) {
  const tmpdir = createTempDir();
  const filename = basename(this.resource);

  writeFileSync(join(tmpdir, filename), source);
  runEmcc(tmpdir, filename);

  const options = loaderUtils.getOptions(this) || {};

  const publicPath =
    typeof options.publicPath === "string"
      ? options.publicPath === "" || options.publicPath.endsWith("/")
        ? options.publicPath
        : `${options.publicPath}/`
      : typeof options.publicPath === "function"
      ? options.publicPath(this.resourcePath, this.rootContext)
      : this._compilation.outputOptions.publicPath || "dist";

  if (!existsSync(publicPath)) {
    mkdirSync(publicPath);
  }

  const wasmPath = join(publicPath, filename + ".wasm");
  const wasm = readFileSync(join(tmpdir, "a.out.wasm"));
  writeFileSync(wasmPath, wasm);

  return `
    import Load from "${join(tmpdir, "a.out.js")}";

    export async function then(cb) {
      const m = Load({
        locateFile(path) {
          if(path.endsWith('.wasm')) {
            return "${filename + ".wasm"}";
          }
          return path;
        }
      });

      m.onRuntimeInitialized = () => {
        delete m.then;
        cb(m);
      }
    }
  `;
};
