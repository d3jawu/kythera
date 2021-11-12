const _typeof = (_) => typeof _;
type TypeString = ReturnType<typeof _typeof>;

// graft Kythera member functions onto JS primitive values
const k_valMap: Record<TypeString, (self: any) => Record<string, Function>> = {
  boolean: (self) => ({
    "||": (other) => self || other,
    "&&": (other) => self && other,
    "!": () => !self,
    "==": (other) => self === other,
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
  function: (self) => ({
    "==": (other) => self.toString() === other.toString(),
  }),
  string: (self) => self, // string functions are already built-in
  object: (self) =>
    self === null
      ? null
      : {
          // deep equality
          "==": (other) => {
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
              if (["==", "!="].includes(key)) {
                return true;
              }

              if (typeof other[key] === "undefined") {
                return false;
              }

              return k_val(self[key])["=="](other[key]);
            });
          },
          // deep inequality
          "!=": (other) => {
            return !k_val(self)["=="](other);
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

const k_typeMap: Record<TypeString, (self: any) => Record<string, Function>> = {
  boolean: (val) => k_type(k_val(val)),
  number: (val) => k_type(k_val(val)),
  string: (val) => k_type(k_val(val)),
  function: (val) => ({
    "<:": (other) => {},
  }),
  object: (val) => {
    if (val === null) {
      return {};
    } else {
      const types = Object.keys(val).reduce((res, key) => {
        res[key] = k_type(val[key]);
        return res;
      }, {});

      // covariant
      types["<:"] = (other) => {
        throw new Error("TODO");
      };

      return types;
    }
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

// get Kythera type-value for a Javascript value
const k_type = (val) => {
  const type = (
    k_typeMap[typeof val] ||
    ((val) => {
      throw new Error(`Unsupported type: ${typeof val} (${val})`);
    })
  )(val);

  return type;
};
