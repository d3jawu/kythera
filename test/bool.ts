import test from "ava";
import compile from "../src/compiler";

import { readFileSync } from "fs";

const runtime = readFileSync("./build/src/runtime/runtime.js");
const prelude = readFileSync("./build/src/runtime/prelude.js");

const build = (program) => `${runtime}\n${prelude}\n${compile(program)}`;

test("Literals", (t) => {
  t.true(eval(build("true")));
  t.false(eval(build("false")));
});

test("not !", (t) => {
  t.false(eval(build("!true")));
  t.true(eval(build("!false")));
});

test("or ||", (t) => {
  t.false(eval(build("false || false")));
  t.true(eval(build("false || true")));
  t.true(eval(build("true || false")));
});

test("and &&", (t) => {
  t.false(eval(build("false && false")));
  t.false(eval(build("false && true")));
  t.false(eval(build("true && false")));
  t.true(eval(build("true && true")));
});

test("Compound expressions", (t) => {
  t.true(eval(build("true || false || (false && true)")));
});
