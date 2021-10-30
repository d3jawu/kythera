import { readFileSync } from "fs";
import compile from "./compiler";

if (process.argv.length < 3) {
  throw new Error("Expected entrypoint argument.");
}

const entryPoint = process.argv[2];

try {
  const res = compile(readFileSync(entryPoint).toString());
  console.log(res);
} catch (err) {
  console.log(err);
}
