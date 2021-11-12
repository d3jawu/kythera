import baretest from "baretest";

const test = baretest("Kythera");

import parse from "./parse";
parse(test);

test.run();
