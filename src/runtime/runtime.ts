const _typeof = (_: unknown) => typeof _;
type TypeString = ReturnType<typeof _typeof>;

type kTypeVal = {
  "<:": kFnVal;
  ":>": kFnVal;
  [x: string]: unknown;
};

// a function that has type data attached
type kFnVal = {
  (...args: unknown[]): unknown;
  k_fnType: kTypeVal;
};

// attaches a kTypeVal to a function type as a field.
const k_attachFnType = (fn: Function, type: kTypeVal): kFnVal => {
  (fn as kFnVal).k_fnType = type;
  return fn as kFnVal;
};

// declare type-values early to allow references to be obtained before they are fully defined
const u_Type = {} as kTypeVal;
const u_Bool = {} as kTypeVal;

// necessary for defining subtype and supertype functions (which are everywhere); must be bootstrapped manually
const u_Fn_Type_Bool = {} as kTypeVal;

u_Fn_Type_Bool["from"] = u_Type;
u_Fn_Type_Bool["to"] = u_Bool;
u_Fn_Type_Bool["<:"] = k_attachFnType(() => {}, u_Fn_Type_Bool);
u_Fn_Type_Bool[":>"] = k_attachFnType(() => {}, u_Fn_Type_Bool);

// TODO I don't think these are strictly correct, I just need them to exist right now
u_Type["<:"] = k_attachFnType(
  (other: kTypeVal) => other["<:"] && other[":>"],
  u_Fn_Type_Bool
);
u_Type[":>"] = k_attachFnType(
  (other: kTypeVal) => other["<:"] && other[":>"],
  u_Fn_Type_Bool
);
const u_None = {
  "<:": k_attachFnType(() => false, u_Fn_Type_Bool),
  ":>": k_attachFnType(() => true, u_Fn_Type_Bool),
} as kTypeVal;
const u_Any = {
  "<:": k_attachFnType(() => true, u_Fn_Type_Bool),
  ":>": k_attachFnType(() => false, u_Fn_Type_Bool),
} as kTypeVal;

// type-values that aren't critical for bootstrapping
const u_Num = {} as kTypeVal;

// allows reuse of references to type structs
const k_typeRegistry: Set<kTypeVal> = new Set();
k_typeRegistry.add(u_None);
k_typeRegistry.add(u_Any);
k_typeRegistry.add(u_Bool);

// graft Kythera member functions onto JS primitive values
const k_valMap: Record<TypeString, Function> = {
  boolean: (self: boolean) => ({
    "||": k_attachFnType(
      (other: boolean) => self || other,
      u_Fn(u_Bool, u_Bool)
    ),
    "&&": k_attachFnType(
      (other: boolean) => self && other,
      u_Fn(u_Bool, u_Bool)
    ),
    "!": k_attachFnType(() => !self, u_Fn(u_None, u_Bool)),
    "==": k_attachFnType(
      (other: boolean) => self === other,
      u_Fn(u_Bool, u_Bool)
    ),
    "!=": k_attachFnType(
      (other: boolean) => self !== other,
      u_Fn(u_Bool, u_Bool)
    ),
  }),
  number: (self: number) => ({
    "+": k_attachFnType((other: number) => self + other, u_Fn(u_Num, u_Num)),
    "-": k_attachFnType((other: number) => self - other, u_Fn(u_Num, u_Num)),
    "*": k_attachFnType((other: number) => self * other, u_Fn(u_Num, u_Num)),
    "/": k_attachFnType((other: number) => self / other, u_Fn(u_Num, u_Num)),
    "%": k_attachFnType(
      (other: number) => ((self % other) + other) % other,
      u_Fn(u_Num, u_Num)
    ), // % in JS is remainder, not modulo
    "<": k_attachFnType((other: number) => self < other, u_Fn(u_Num, u_Bool)),
    ">": k_attachFnType((other: number) => self > other, u_Fn(u_Num, u_Bool)),
    "<=": k_attachFnType((other: number) => self <= other, u_Fn(u_Num, u_Bool)),
    ">=": k_attachFnType((other: number) => self >= other, u_Fn(u_Num, u_Bool)),
    "==": k_attachFnType(
      (other: number) => self === other,
      u_Fn(u_Num, u_Bool)
    ),
    "!=": k_attachFnType(
      (other: number) => self !== other,
      u_Fn(u_Num, u_Bool)
    ),
  }),
  function: (self: Function | kFnVal) => ({
    "==": (other: Function | kFnVal) => self.toString() === other.toString(),
  }),
  string: (self: string) => self, // for now, just expose built-in string functions
  object: (self: Record<string, unknown>) =>
    self === null
      ? null
      : {
          // deep equality
          "==": k_attachFnType((other: Record<string, unknown>) => {
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
          }, u_Fn(k_type(self), u_Bool)),
          // deep inequality
          "!=": k_attachFnType((other: unknown) => {
            return !k_val(self)["=="](other);
          }, u_Fn(k_type(self), u_Bool)),
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
    throw new Error("TODO: symbol/enum");
  },
};

const k_val = (val: unknown) =>
  (
    k_valMap[typeof val] ||
    ((val: unknown) => {
      throw new Error(`Unsupported value: ${val}`);
    })
  )(val);

const k_typeMap: Record<TypeString, Function> = {
  boolean: (val: boolean) => u_Bool,
  number: (val: number) => u_Num,
  string: (val: string) => k_type(k_val(val)),
  function: (val: Function | kTypeVal) => {
    if ("k_fnType" in val) {
      return val["k_fnType"];
    } else {
      console.error(val.toString());
      throw new Error("Function value needs attached type value.");
    }
  },
  object: (self: Record<string, unknown>) => {
    if (self === null) {
      throw new Error("null is not supported");
    } else {
      const selfType: any = Object.keys(self).reduce(
        (res: Record<string, unknown>, key) => {
          // break on circular reference
          if (k_typeRegistry.has(self[key] as kTypeVal)) {
            return res;
          }

          res[key] = k_type(self[key]);
          return res;
        },
        {}
      );

      // covariant
      selfType["<:"] = k_attachFnType((otherType: Record<string, unknown>) => {
        // 'self' <: 'other' if self provides every field f in other, and self[f] <: other[f]
        return Object.keys(otherType).every((key) => {
          if (key === "<:" || key === ":>") {
            // skip subtype functions themselves
            return true;
          }

          if (!(key in selfType)) {
            return false;
          }

          // reference equality means definitely the same type, which means definitely compatible
          if (selfType[key] == otherType[key]) {
            return true;
          }

          if (!selfType[key]) return selfType[key]["<:"](otherType[key]);
        });
      }, u_Fn_Type_Bool);

      selfType[":>"] = k_attachFnType(
        (other: any) => other["<:"](self),
        u_Fn_Type_Bool
      );

      return selfType as kTypeVal;
    }
  },
  bigint: () => {
    throw new Error("bigint is not supported by Kythera.");
  },
  undefined: () => {
    throw new Error("undefined is not supported by Kythera.");
  },
  symbol: () => {
    throw new Error("TODO: symbol type");
  },
};

// get Kythera type-value for a Javascript value
const k_type = (val: unknown) => {
  const type = (
    k_typeMap[typeof val] ||
    ((val: unknown) => {
      throw new Error(`Unsupported type: ${typeof val} (${val})`);
    })
  )(val);
  k_typeRegistry.add(type);
  return type;
};
// type literals

// factory for function types
const u_Fn = (from: kTypeVal, to: kTypeVal): kTypeVal => {
  if (from === undefined || to === undefined) {
    throw new Error("function with undefined param types");
  }

  const existing = [...k_typeRegistry].find((type) => {
    if (!type.from || !type.to) {
      return false;
    }

    const { from: f = null, to: t = null } = type;

    if (f == from && t == to) {
      return true;
    }
  });

  // reuse function type if possible
  if (existing) {
    return existing;
  }

  const fnType = {
    from,
    to,
    // contravariant in parameter, covariant in return
    "<:": k_attachFnType(
      (other: Record<string, unknown>) =>
        from[":>"](other.from) && to["<:"](other.to),
      u_Fn_Type_Bool
    ),

    ":>": k_attachFnType(
      (other: any) => other["<:"](u_Fn(from, to)),
      u_Fn_Type_Bool
    ),
  };

  k_typeRegistry.add(fnType);

  return fnType;
};

// populate fields for type-values using types themselves!

// Bool
Object.entries(k_type(k_val(true))).forEach(([k, v]) => {
  u_Bool[k] = v;
});
// Num
Object.entries(k_type(k_val(0))).forEach(([k, v]) => {
  u_Num[k] = v;
});
