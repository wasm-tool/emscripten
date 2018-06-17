import("./fib.c").then(({_fib}) => {
  document.body.innerHTML = "fib(10) = " + _fib(10);
});
