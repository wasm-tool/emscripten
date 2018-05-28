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
        loader: "./loader",
        type: "webassembly/experimental"
      },
      {
        test: /\.wat$/,
        loader: "wast-loader",
        type: "webassembly/experimental"
      }
    ]
  },
  resolve: {
    alias: {
      'env': './dist/loader.js',
      'global': './dist/loader.js'
    },
  },
  node: {
    fs: "empty"
  },
  plugins: [new HtmlWebpackPlugin()]
};
