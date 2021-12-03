import test from "ava";

import { build } from "./util";

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
