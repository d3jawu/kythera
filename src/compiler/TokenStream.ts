const isWhitespace = (char: string): boolean =>
  [" ", "\t", "\n", "\r"].includes(char);

const isSymbol = (char: string): boolean =>
  [".", ",", ":", "!", "+", "-", "/", "*", "%", "(", ")", "'", '"'].includes(
    char
  );

export { isWhitespace, isSymbol };
export default class TokenStream {
  pos: number;
  line: number;
  col: number;
  input: string;

  constructor(input: string) {
    this.input = input;

    this.pos = 0;
    this.line = 1;
    this.col = 0;
  }

  eof() {
    return this.pos >= this.input.length;
  }

  consumeChar(): string {
    let c = this.input.charAt(this.pos);
    this.pos += 1;

    if (c === "\n") {
      this.line += 1;
      this.col = 0;
    } else {
      this.col += 1;
    }

    return c;
  }

  peekChar(): string {
    return this.input.charAt(this.pos);
  }

  // consume token and then rewind to before token
  peek(): string {
    const pos = this.pos;
    const line = this.line;
    const col = this.col;

    const token = this.consume();

    this.pos = pos;
    this.line = line;
    this.col = col;
    return token;
  }

  // reads next token, advancing stream in the process
  consume(): string {
    while (isWhitespace(this.peekChar())) {
      this.consumeChar();
    }

    let token = "" + this.consumeChar();

    if (isSymbol(token)) {
      return token;
    }

    while (
      !isWhitespace(this.peekChar()) &&
      !isSymbol(this.peekChar()) &&
      !this.eof()
    ) {
      token += this.consumeChar();
    }

    return token;
  }

  consumeExpect(expected: string): string {
    const next = this.consume();
    if (next !== expected) {
      throw new Error(`Expected ${expected} but got ${next}`);
    }
    return next;
  }

  throwWithPos(message: string) {
    throw new Error(`${message} at line ${this.line}, col ${this.col}`);
  }
}
