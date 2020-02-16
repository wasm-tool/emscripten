const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = {
  entry: "./src/index.js",
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
  plugins: [new HtmlWebpackPlugin()]
};
