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
          (next) => !!precedenceOf(next),
          () => {
            composed = binExp(composed, 0);
          }
        )
        .with(".", () => {
          stream.consumeExpect(".");
          const field = stream.consume();
          composed = `${composed}["${field}"]`;
        })
        .with("(", () => {
          stream.consumeExpect("(");
          const args: Array<JS> = [];
          while (stream.peek() !== ")") {
            args.push(exp(stream.consume()));

            if (stream.peek() === ",") {
              stream.consumeExpect(",");
            }
          }
          stream.consumeExpect(")");
          composed = `${composed}(${args.join(",")})`;
        })
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
      .with("!", () => {
        return `!${exp(stream.consume())}`;
      })
      .with('"', (delimiter: string) => {
        let str = "";
        while (stream.peekChar() !== delimiter) {
          str += stream.consumeChar();
        }
        stream.consumeExpect(delimiter);

        return `"${str}"`;
      })
      .with("true", () => "true")
      .with("false", () => "false")
      .with("{", () => {
        let entries: Record<string, JS> = {};
        // object literal
        while (stream.peek() !== "}") {
          const key = stream.consume();
          stream.consumeExpect(":");

          const val = exp(stream.consume());
          stream.consumeExpect(",");

          entries[key] = val;
        }
        stream.consumeExpect("}");

        return `
        {
          ${Object.entries(entries).reduce((prev, [key, js]) => {
            return `${prev}${key}: ${js},`;
          }, "")}
        }
        `;
      })
      .with("if", () => {
        // if as expression - cannot return
        const condition = exp(stream.consume());
        stream.consumeExpect("{");
        let ifBody = "(() => {";
        while (stream.peek() !== "}") {
          ifBody += statement(stream.consume());
        }
        stream.consumeExpect("}");
        ifBody += "})()";

        // if-expression must be exhaustive
        if (stream.peek() !== "else") {
          throw new Error("if-expression must be exhaustive");
        }
        stream.consumeExpect("else");
        const elseBody = match<string, JS>(stream.consume())
          .with("if", (next: "if") => exp(next))
          .with("{", () => {
            let elseBody = "(() => {";
            while (stream.peek() !== "}") {
              elseBody += statement(stream.consume());
            }
            stream.consumeExpect("}");
            elseBody += "})()";
            return elseBody;
          })
          .otherwise(() => {
            throw new Error(
              `Expected 'if' or '{' after 'else' but got ${stream.peek()}`
            );
          });

        return `(${condition} ? ${ifBody} : ${elseBody})`;
      })
      .when(isIdentifier, (name) => {
        if (stream.peek() === "=") {
          stream.consumeExpect("=");

          const val = exp(stream.consume());

          return `(${name} = ${val})`;
        } else {
          return `(${name})`;
        }
      })
      .otherwise((token) => {
        throw new Error(`Unexpected token: '${token}'`);
      });

  // copied from Java's precedence levels
  const precedenceOf = (op: string): number | null =>
    match<string, number | null>(op)
      .with("||", () => 3)
      .with("&&", () => 4)
      .with("==", "!=", () => 8)
      .with("<", ">", "<=", ">=", () => 9)
      .with("+", "-", () => 11)
      .with("*", "/", "%", () => 12)
      .otherwise(() => null);

  const binExp = (left: JS, currentPrecedence: number): JS => {
    const op = stream.peek();
    const nextPrecedence = precedenceOf(op);

    if (nextPrecedence && nextPrecedence > currentPrecedence) {
      stream.consume();
      const right: JS = binExp(expAtom(stream.consume()), nextPrecedence);

      // TODO treat op as overloaded operator function call
      const binary = `k_val(${left})["${op}"](${right})`;
      return binExp(binary, currentPrecedence);
    }

    return left;
  };

  const statement = (token: string): JS =>
    match(token)
      .with("//", () => {
        // single-line comment
        while (stream.peekChar() !== "\n" && !stream.eof()) {
          stream.consumeChar();
        }

        return "";
      })
      .with("/*", () => {
        // block comment
        let nestLevel = 1;

        while (true) {
          if (stream.peek() === "/*") {
            stream.consume();
            nestLevel += 1;
          }

          if (stream.peekChar() === "*") {
            stream.consumeChar();

            if (stream.peekChar() === "/") {
              stream.consumeChar();

              nestLevel -= 1;

              if (nestLevel === 0) {
                break;
              }
            }
          }

          if (stream.eof()) {
            throw new Error("Unexpected EOF in block comment");
          }

          stream.consumeChar();
        }

        return "";
      })
      .with("let", "const", (def) => {
        const ident = stream.consume();
        stream.consumeExpect("=");
        const val: JS = exp(stream.consume());

        return `${def} ${ident} = ${val};`;
      })
      .with("if", (def) => {
        // if as statement - can return/break, but doesn't evaluate to a value
        const condition = exp(stream.consume());
        let body = `if (${condition}) {`;

        stream.consumeExpect("{");
        while (stream.peek() !== "}") {
          body += statement(stream.consume());
        }
        stream.consumeExpect("}");
        body += "}";

        let elsed = false;
        while (stream.peek() === "else") {
          if (elsed) {
            throw new Error(
              "Unexpected 'else' after if-statement is already exhaustive"
            );
          }

          stream.consume();
          body += " else ";

          if (stream.peek() === "if") {
            stream.consumeExpect("if");
            const condition = exp(stream.consume());
            body += `if ${condition}`;
          } else {
            elsed = true;
          }

          stream.consumeExpect("{");
          body += "{";

          while (stream.peek() !== "}") {
            body += statement(stream.consume());
          }
          stream.consumeExpect("}");
          body += "}";
        }

        return body;
      })
      .with("while", () => {
        const condition = exp(stream.consume());
        stream.consumeExpect("{");

        let body = `while(${condition}) {`;
        while (stream.peek() !== "}") {
          body += statement(stream.consume());
        }
        stream.consumeExpect("}");
        body += "}";

        return body;
      })
      .with(";", () => "")
      .otherwise((token) => exp(token) + ";");

  // parse statements
  while (!stream.eof()) {
    let token = stream.consume();

    if (!token) {
      continue;
    }

    try {
      output += statement(token);
    } catch (err) {
      console.log(output);
      stream.throwWithPos(err as string);
    }
  }

  return output;
}
