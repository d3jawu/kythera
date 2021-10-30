import { match } from "ts-pattern";

import TokenStream from "./TokenStream";

// indicates code that has been compiled into JS
type JS = string;

export default function compile(raw: string): JS {
  const stream = new TokenStream(raw);

  let output = "";

  const isIdentifier: (string) => boolean = (word) =>
    /^[_a-zA-Z]+[_a-zA-Z0-9]*/.test(word);

  // starting token must already have been consumed and be passed as param.
  const exp = (token: string): JS => {
    let composed = expAtom(token);

    while (true) {
      const next = stream.peek();
      let stop = false;
      match(next)
        .when(
          (next) => ["+", "-", "/", "*", "%"].includes(next),
          () => {
            composed = binExp(composed, 0);
          }
        )
        .otherwise(() => {
          stop = true;
        });

      if (stop) {
        break;
      }
    }

    return `(${composed})`;
  };

  const expAtom = (token: string): JS =>
    match<string, JS>(token)
      .with("(", () => {
        const e = exp(stream.consume());
        stream.consumeExpect(")");
        return e;
      })
      .when(
        (word) => /-|[0-9]+/.test(word),
        (token: string) => {
          let numberString = "";

          // negative sign, if present
          if (token === "-") {
            numberString += "-";
            token = stream.consume(); // reads in integer part
          }

          // positive whole number part
          numberString += token;

          // decimal part
          if (stream.peek() === ".") {
            stream.consumeExpect(".");
            numberString += ".";

            const decimalPart = stream.consume();
            numberString += decimalPart;
          }

          return numberString;
        }
      )
      .with("true", () => "true")
      .with("false", () => "false")
      .when(isIdentifier, (name) => {
        if (stream.peek() === "=") {
          stream.consumeExpect("=");

          const val = exp(stream.consume());

          // return scope.set(name, val);
          return `(${name} = ${val})`;
        } else {
          return `(${name})`;
        }
      })
      .otherwise((word) => {
        throw new Error(`Unexpected token: ${word}`);
      });

  const precedences: Record<string, number> = {
    "+": 11,
    "-": 11,
    "*": 12,
    "/": 12,
    "%": 12,
  };

  const binExp = (left: JS, currentPrecedence: number): JS => {
    const op = stream.peek();
    const nextPrecedence = precedences[op];

    if (nextPrecedence && nextPrecedence > currentPrecedence) {
      const next = stream.consume();
      const right = binExp(expAtom(stream.consume()), nextPrecedence);

      // TODO treat op as overloaded operator function call
      const binary = `${left} ${op} ${right}`;
      return binExp(binary, currentPrecedence);
    }

    return left;
  };

  // parse statements
  while (!stream.eof()) {
    let token = stream.consume();

    console.log("token:");
    console.log(token);

    try {
      match(token)
        .with("/", () => {
          if (stream.peekChar() === "/") {
            while (stream.peekChar() !== "\n") {
              stream.consumeChar();
            }
          } else if (stream.peekChar() === "*") {
            throw new Error("Block comments not yet implemented");
          } else {
            throw new Error("Unexpected '/'");
          }
        })
        .with("let", () => {
          const ident = stream.consume();
          stream.consumeExpect("=");
          const val: JS = exp(stream.consume());

          output += `let ${ident} = ${val}`;
        })
        .otherwise((token) => {
          output += exp(token);
        });
      output += ";\n";
    } catch (err) {
      stream.throwWithPos(err as string);
    }
  }

  return output;
}
