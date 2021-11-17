import test from "ava";
import compile from "../src/compiler";

import { readFileSync } from "fs";

const runtime = readFileSync("./build/src/runtime/runtime.js");
const prelude = readFileSync("./build/src/runtime/prelude.js");

const build = (program) => `${runtime}\n${prelude}\n${compile(program)}`;

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
