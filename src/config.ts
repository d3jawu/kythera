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
    if (i === 0 && !arg.includes(":") && !arg.includes("=")) {
      // allow first argument to be treated as entrypoint file name
      args["entryPoint"] = arg;
      return args;
    }

    let argName, argVal;
    if (arg.includes(":")) {
      [argName, argVal] = arg.split(":");
    } else if (arg.includes("=")) {
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

const configArgs = clArgs as ConfigTemplate;
const config = {
  ...configTemplate,
  ...(configArgs as ConfigTemplate),
};
const configKeys = Object.keys(config);
configTemplateKeys.forEach((key) => {
  if (!configKeys.includes(key)) {
    throw new Error(
      `Option not provided by config file or command-line arguments: ${key}`
    );
  }
});

export default config as ConfigTemplate;
