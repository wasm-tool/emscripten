#include <emscripten.h>

EMSCRIPTEN_KEEPALIVE
int fib(int n) {
  int l1 = 0;
  int l2 = 1;

  int b;

  for (int i = 0; i < n; i++) {
    b = l1 + l2;

    l2 = l1;
    l1 = b;
  }

  return b;
}
