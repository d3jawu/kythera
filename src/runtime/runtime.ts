const _typeof = (_) => typeof _;
type TypeString = ReturnType<typeof _typeof>;

// attaches a kTypeVal to a function type as a field.
const k_attachFnType = (fn, type: kTypeVal) => {
  fn.k_fnType = type;
  return fn;
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
  (other) => other["<:"] && other[":>"],
  u_Fn_Type_Bool
);
u_Type[":>"] = k_attachFnType(
  (other) => other["<:"] && other[":>"],
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

// allows reuse of references to type objects
const k_typeRegistry = [u_None, u_Any, u_Bool];

// graft Kythera member functions onto JS primitive values
const k_valMap: Record<TypeString, (self: any) => Record<string, Function>> = {
  boolean: (self) => ({
    "||": k_attachFnType((other) => self || other, u_Fn(u_Bool, u_Bool)),
    "&&": k_attachFnType((other) => self && other, u_Fn(u_Bool, u_Bool)),
    "!": k_attachFnType(() => !self, u_Fn(u_None, u_Bool)),
    "==": k_attachFnType((other) => self === other, u_Fn(u_Bool, u_Bool)),
    "!=": k_attachFnType((other) => self !== other, u_Fn(u_Bool, u_Bool)),
  }),
  number: (self) => ({
    "+": k_attachFnType((other) => self + other, u_Fn(u_Num, u_Num)),
    "-": k_attachFnType((other) => self - other, u_Fn(u_Num, u_Num)),
    "*": k_attachFnType((other) => self * other, u_Fn(u_Num, u_Num)),
    "/": k_attachFnType((other) => self / other, u_Fn(u_Num, u_Num)),
    "%": k_attachFnType(
      (other) => ((self % other) + other) % other,
      u_Fn(u_Num, u_Num)
    ), // % in JS is remainder, not modulo
    "<": k_attachFnType((other) => self < other, u_Fn(u_Num, u_Bool)),
    ">": k_attachFnType((other) => self > other, u_Fn(u_Num, u_Bool)),
    "<=": k_attachFnType((other) => self <= other, u_Fn(u_Num, u_Bool)),
    ">=": k_attachFnType((other) => self >= other, u_Fn(u_Num, u_Bool)),
    "==": k_attachFnType((other) => self === other, u_Fn(u_Num, u_Bool)),
  }),
  function: (self) => ({
    // "==": (other) => self.toString() === other.toString(),
  }),
  string: (self) => self, // string functions are already built-in
  object: (self) =>
    self === null
      ? null
      : {
          // deep equality
          "==": k_attachFnType((other) => {
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
          "!=": k_attachFnType((other) => {
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

const k_val = (val: any) =>
  (
    k_valMap[typeof val] ||
    ((val) => {
      throw new Error(`Unsupported value: ${val}`);
    })
  )(val);

type kTypeVal = {
  "<:": (kTypeVal) => boolean;
  ":>": (kTypeVal) => boolean;
  [x: string]: any;
};

const k_typeMap: Record<TypeString, (self: any) => kTypeVal> = {
  boolean: (val: boolean) => k_type(k_val(val)),
  number: (val: number) => k_type(k_val(val)),
  string: (val: string) => k_type(k_val(val)),
  function: (val: Function) => {
    if (val["k_fnType"]) {
      return val["k_fnType"];
    } else {
      console.error(val.toString());
      throw new Error("Function value needs attached type value.");
    }
  },
  object: (self) => {
    if (self === null) {
      throw new Error("null is not supported");
    } else {
      const types = Object.keys(self).reduce((res, key) => {
        // break on circular reference
        if (k_typeRegistry.includes(self[key])) {
          return res;
        }

        res[key] = k_type(self[key]);
        return res;
      }, {});

      // covariant
      types["<:"] = k_attachFnType((other) => {
        throw new Error("TODO: subtype");
      }, u_Fn_Type_Bool);

      types[":>"] = k_attachFnType((other) => {
        throw new Error("TODO: supertype");
      }, u_Fn_Type_Bool);

      return types as kTypeVal;
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
const k_type = (val) =>
  (
    k_typeMap[typeof val] ||
    ((val) => {
      throw new Error(`Unsupported type: ${typeof val} (${val})`);
    })
  )(val);

// type literals

// factory for function types
const u_Fn = (from: kTypeVal, to: kTypeVal): kTypeVal => {
  if (from === undefined || to === undefined) {
    throw new Error("function with undefined param types");
  }

  const existing = k_typeRegistry.find((type) => {
    if (!from || !to) {
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
      (other) => from[":>"](other.from) && to["<:"](other.to),
      u_Fn_Type_Bool
    ),

    ":>": k_attachFnType(
      (other) => other["<:"](u_Fn(from, to)),
      u_Fn_Type_Bool
    ),
  };

  k_typeRegistry.push(fnType);

  return fnType;
};

// populate fields for type-values using types themselves!

// Bool
Object.entries(k_type(k_val(true))).forEach(([k, v]) => {
  u_Bool[k] = v;
});
Object.entries(k_type(k_val(0))).forEach(([k, v]) => {
  u_Num[k] = v;
});
