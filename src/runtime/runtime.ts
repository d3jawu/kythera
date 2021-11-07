const _typeof = (_) => typeof _;
type TypeString = ReturnType<typeof _typeof>;

// graft Kythera member functions onto JS primitive values
const k_valMap: Record<TypeString, (self: any) => Record<string, Function>> = {
  boolean: (self) => ({
    "||": (other) => self || other,
    "&&": (other) => self && other,
    "!": () => !self,
    // on Boolean, === is just an alias of ==.
    "==": (other) => self === other,
    "===": (other) => self === other,
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
    // on Number, === is just an alias of ==. Both check for strong equality
    "==": (other) => self === other,
    "===": (other) => self === other,
  }),
  function: () => ({}),
  string: (self) => self, // string functions are already built-in
  object: (self) =>
    self === null
      ? null
      : {
          // reference equality
          "==": (other) => self == other,
          "!=": (other) => self != other,
          // deep equality
          "===": (other) => {
            if (typeof other !== "object") {
              return false;
            }

            const selfKeys = Object.keys(self);
            const otherKeys = Object.keys(other);

            if (selfKeys.length !== otherKeys.length) {
              return false;
            }

            return selfKeys.every((key) => {
              // skip equality functions themselves
              if (["==", "!=", "===", "!=="].includes(key)) {
                return true;
              }

              if (typeof other[key] === "undefined") {
                return false;
              }

              return k_val(self[key])["==="](other[key]);
            });
          },
          // deep inequality
          "!==": (other) => {
            return !k_val(self)["==="](other);
          },
          // allow equality-checking definitions to be overridden
          ...self,
        },
  bigint: () => {
    throw new Error("bigint is not supported by Kythera.");
  },
  undefined: () => {
    throw new Error("undefined is not supported by Kythera.");
  },
  symbol: () => {
    throw new Error("TODO");
  },
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
const k_type = (val) => {
  const type = (
    k_typeMap[typeof val] ||
    ((val) => {
      throw new Error(`Unsupported type: ${typeof val} (${val})`);
    })
  )(val);

  // 'self' is a subtype of 'other' if every key (and its type) in 'other' is present in 'self'
  type["<:"] = (other) => {
    throw new Error("TODO: subtype");
  };
  // 'self' is a supertype of 'other' if every key (and its type) in 'self' is present in 'other'
  type[":>"] = (other) => {
    throw new Error("TODO: supertype");
  };

  return type;
};
