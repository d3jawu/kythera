import test from "ava";

import { build } from "./util";

test("Literals", (t) => {
  t.is(eval(build("2")), 2);
  t.is(eval(build("-99")), -99);
  t.is(eval(build("1.6")), 1.6);
  t.is(eval(build("-9.1")), -9.1);
  t.is(eval(build("-0.1")), -0.1);
  t.is(eval(build("-0.5")), -0.5);
});

test("Arithmetic", (t) => {
  t.is(eval(build("1 + 2")), 3);
  t.is(eval(build("1 - 2")), -1);
  t.is(eval(build("2 * 3")), 6);
  t.is(eval(build("1 / 2")), 0.5);
  // % in Kythera is modulo, not remainder
  t.is(eval(build("7 % 5")), 2);
  t.is(eval(build("-7 % 5")), 3);
  t.is(eval(build("7 % -5")), -3);
  t.is(eval(build("-7 % -5")), -2);
});

test("Comparison", (t) => {
  t.true(eval(build("1 < 2")));
  t.false(eval(build("1 < 1")));
  t.false(eval(build("2 < 1")));

  t.true(eval(build("2 > 1")));
  t.false(eval(build("1 > 1")));
  t.false(eval(build("1 > 2")));

  t.true(eval(build("1 <= 2")));
  t.true(eval(build("1 <= 1")));
  t.false(eval(build("2 <= 1")));

  t.true(eval(build("2 >= 1")));
  t.true(eval(build("1 >= 1")));
  t.false(eval(build("1 >= 2")));

  t.true(eval(build("1 == 1")));
  t.false(eval(build("1 == 2")));

  t.true(eval(build("1 != 2")));
  t.false(eval(build("1 != 1")));
});

test("Order of operations", (t) => {
  t.is(eval(build("2 + 3 * 4 + 5")), 19);
  t.is(eval(build("(2 + 3) * 4 + 5")), 25);
  t.is(eval(build("(2 + 3) * (4 + 5)")), 45);
  t.is(eval(build("3 + 4 * 2 / (1 - 5)")), 1);
});
