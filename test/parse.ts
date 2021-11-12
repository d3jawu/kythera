import { strict as assert } from "assert";
import compile from "../src/compiler";

export default (test) => {
  test("Single-line comment", () => {
    assert.doesNotThrow(() => {
      const r1 = compile(`// single-line comment`);
      assert.equal(r1, "");

      const r2 = compile(`//single-line comment without leading space`);
      assert.equal(r2, "");
    });
  });

  test("Block comment", () => {
    assert.doesNotThrow(() => {
      const r1 = compile(`
/*multi
line
comment
without
leading
or
trailing
space*/`);
      assert.equal(r1, "");

      const r2 = compile(`
/* multi
line
comment
*/`);
      assert.equal(r2, "");
    });

    assert.throws(() =>
      compile(`
  /*
  unclosed
  block
  comment`)
    );
  });
};
