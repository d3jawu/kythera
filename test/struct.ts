import test from "ava";
import compile from "../src/compiler";

import { readFileSync } from "fs";

const runtime = readFileSync("./build/src/runtime/runtime.js");
const prelude = readFileSync("./build/src/runtime/prelude.js");

const build = (program) => `${runtime}\n${prelude}\n${compile(program)}`;

test("Deep equality", (t) => {
  let u_res: any;

  eval(
    build(`
const a = {
    x: 3,
    y: 4,
    z: {
        q: 5,
    }
}

const b = {
    x: 3,
    y: 4,
    z: {
        q: 5,
    }
}

res = a == b
`)
  );

  t.true(u_res);
});
