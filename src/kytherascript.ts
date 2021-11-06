import { readFileSync } from "fs";

import { match } from "ts-pattern";

import { format as prettier } from "prettier";
import { minify } from "terser";

import compile from "./compiler";

import config, { Mode } from "./config";
const { mode, entryPoint } = config;

(async () => {
  try {
    const program = compile(readFileSync(entryPoint).toString());

    // only read prelude if compile succeeds
    const prelude: string = readFileSync("./lib/runtime.js").toString();
    const raw = prelude + "\n" + program;

    const out = await match<Mode, Promise<string>>(mode)
      .with("dev", async () => raw)
      .with(
        "build",
        async () => (await minify(raw, { sourceMap: false })).code || ""
      )
      .with("debug", async () => await prettier(raw, { parser: "babel" }))
      .otherwise((mode) => {
        throw new Error(`Invalid build mode: ${mode}`);
      });
    console.log(out);
  } catch (err) {
    console.log(err);
  }
})();
