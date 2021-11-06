const _typeof = (_) => typeof _;
type TypeString = ReturnType<typeof _typeof>;

// graft Kythera member functions onto JS primitive values
const k_valMap: Record<TypeString, (self: any) => Record<string, Function>> = {
  boolean: (self) => ({
    "||": (other) => self || other,
    "&&": (other) => self && other,
    "!": () => !self,
  }),
  number: (self) => ({
    "+": (other) => self + other,
    "-": (other) => self - other,
    "*": (other) => self * other,
    "/": (other) => self / other,
    "%": (other) => ((self % other) + other) % other, // % in JS is remainder, not modulo
    "<": (other) => self < other,
    ">": (other) => self > other,
    "<=": (other) => self <= other,
    ">=": (other) => self >= other,
    "==": (other) => self === other,
  }),
  function: () => ({}),
  string: () => ({
    // TODO substring, split, join, etc
  }),
  object: (self) => self,
  bigint: () => ({}),
  undefined: () => ({}),
  symbol: () => ({}),
};

const k_val = (val: any) =>
  (
    k_valMap[typeof val] ||
    ((val) => {
      throw new Error(`Unsupported value: ${val}`);
    })
  )(val);

// graft member function *types* onto JS primitives
const k_typeMap: Record<TypeString, (self: any) => Record<string, Function>> = {
  boolean: (val) => ({}),
  number: (val) => ({}),
  string: (val) => ({}),
  function: (val) => ({}),
  object: (val) => {
    if (val === null) {
    } else {
      // plain object
      // introspect members
    }

    return {};
  },
  bigint: () => ({}),
  undefined: () => ({}),
  symbol: () => ({}),
};

// get Kythera type-value for a Javascript value
const k_type = (val) => ({
  ...(
    k_typeMap[typeof val] ||
    ((val) => {
      throw new Error(`Unsupported type: ${typeof val} (${val})`);
    })
  )(val),
  "<:": (other) => {
    throw new Error("TODO: subtype");
  },
  ":>": (other) => {
    throw new Error("TODO: supertype");
  },
});
