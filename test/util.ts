import { readFileSync } from "fs";
import compile from "../src/compiler";

const runtime = readFileSync("./build/src/runtime/runtime.js");
const prelude = readFileSync("./build/src/runtime/prelude.js");

const build = (program: string) =>
  `${runtime}\n${prelude}\n${compile(program)}`;

export { runtime, prelude, build };
