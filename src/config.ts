export type Mode = "dev" | "build" | "debug";
const configTemplate = {
  entryPoint: "./main.ky",
  mode: "dev" as Mode,
};
type ConfigTemplate = typeof configTemplate;
const configTemplateKeys = Object.keys(configTemplate);

// read CLI args
const clArgs = process.argv
  .slice(2)
  .reduce((args: Record<string, string>, arg, i) => {
    if (i === 0 && !arg.includes("=")) {
      // allow first argument to be treated as entrypoint file name
      args["entryPoint"] = arg;
      return args;
    }

    let argName, argVal;
    if (arg.includes("=")) {
      [argName, argVal] = arg.split("=");
    } else {
      throw new Error(
        `Improperly formatted command-line argument: ${arg}. Please use 'argName:argValue' or 'argName=argValue'.`
      );
    }

    args[argName] = argVal;
    return args;
  }, {});

// validate CLI config args
Object.keys(clArgs).forEach((argName) => {
  if (!configTemplateKeys.includes(argName)) {
    throw new Error(`Unrecognized command-line argument: ${argName}`);
  }
});

const config = {
  ...configTemplate,
  ...(clArgs as ConfigTemplate),
};

export default config as ConfigTemplate;
