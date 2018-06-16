import("./add.c").then(({_teststring, _fib}) => {

  document.body.innerHTML = "teststring() = " + _teststring() + "<br />";
  document.body.innerHTML += "fib(10) = " + _fib(10) + "<br />";
});
