import("./add.c").then((m) => {
  const exports = m.default;
  // console.log("index.js", exports);
  document.body.innerHTML = "fib(10) = " + exports._fib(10);
});
