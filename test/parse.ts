import test from "ava";
import compile from "../src/compiler";

test("Accepts empty file", (t) => {
  t.notThrows(() => {
    t.is(compile(""), "");
  });
});

test("Single-line comments", (t) => {
  t.notThrows(() => {
    const r1 = compile("// single-line comment");
    t.is(r1, "");

    const r2 = compile(`//single-line comment without leading space`);
    t.is(r2, "");
  });
});

test("Block comments", (t) => {
  t.notThrows(() => {
    t.is(
      compile(`
/* multi
line
comment
*/`),
      ""
    );

    t.is(
      compile(
        `/*multi
line
comment
without
leading
or
trailing
space*/`
      ),
      ""
    );

    const r3 = compile(`
/*
multi line
/* /* deeply */ nested */
comment
*/`);
  });

  t.throws(() => {
    compile(`
/*
unclosed
block
comment`);
  });

  t.throws(() => {
    compile(`/*
Unclosed
/* nested
block comment*/`);
  });
});

test("Optional semicolons", (t) => {
  t.is(compile("true; false"), compile("true false"));
});

test("Parentheses", (t) => {
  t.notThrows(() => {
    t.is(eval(compile("true")), eval(compile("(true)")));
  });

  t.throws(() => {
    compile("(true");
  });
});
