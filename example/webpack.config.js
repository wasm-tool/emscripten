const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "bundle.js"
  },
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
  plugins: [new HtmlWebpackPlugin()]
};
