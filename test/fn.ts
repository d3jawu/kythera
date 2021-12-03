import test from "ava";

import { build } from "./util";

test("Fibonacci", (t) => {
  let u_res: any;

  eval(
    build(`
const fibo = fn(n) {
  if n <= 1 {
      return n
  }

  return fibo(n - 1) + fibo(n - 2)
}

res = fibo(12)
`)
  );

  t.is(u_res, 144);
});
