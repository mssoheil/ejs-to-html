#!/usr/bin/env node
import path from "path";
import { startDevServer } from "./server";
import { version } from "../package.json";

interface CliOptions {
  templatePath: string;
  dataPath?: string;
  port?: number;
}

function printHelp(): void {
  const helpText = `
Usage:
  ejs-to-html --template <path/to/template.ejs> [options]

Options:
  -t, --template <path>   Path to EJS template file (required)
  -d, --data <path>       Path to JSON data file (optional)
  -p, --port <number>     Port to listen on (default: 3000)
  -h, --help              Show this help message
  -v, --version           Show version

Examples:
  ejs-to-html --template example/template.ejs
  ejs-to-html -t example/template.ejs -d example/data.json -p 4000
`;
  console.log(helpText.trim());
}

function die(message: string, showHelp = true) {
  console.error(`Error: ${message}`);
  if (showHelp) {
    console.error("");
    printHelp();
  }
  process.exit(1);
}

function parseArgs(argv: string[]): CliOptions {
  const args = argv.slice(2);
  const options: { templatePath?: string; dataPath?: string; port?: number } =
    {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case "--template":
      case "-t": {
        const next = args[++i];
        if (!next) die("Missing value for --template");
        options.templatePath = next;
        break;
      }

      case "--data":
      case "-d": {
        const next = args[++i];
        if (!next) die("Missing value for --data");
        options.dataPath = next;
        break;
      }

      case "--port":
      case "-p": {
        const next = args[++i];
        if (!next) die("Missing value for --port");
        const port = Number(next);
        if (!Number.isInteger(port) || port <= 0 || port > 65535) {
          die("Port must be an integer between 1 and 65535");
        }
        options.port = port;
        break;
      }

      case "--help":
      case "-h":
        printHelp();
        process.exit(0);

      case "--version":
      case "-v":
        console.log(version);
        process.exit(0);

      default:
        if (arg.startsWith("-")) {
          die(`Unknown option: ${arg}`);
        } else {
          if (!options.templatePath) {
            options.templatePath = arg;
          } else {
            die(`Unexpected positional argument: ${arg}`);
          }
        }
    }
  }

  if (!options.templatePath) {
    die("--template is required");
  }

  return {
    templatePath: path.resolve(options.templatePath!),
    dataPath: options.dataPath ? path.resolve(options.dataPath) : undefined,
    port: options.port,
  };
}

function main(): void {
  const options = parseArgs(process.argv);
  startDevServer(options);
}

main();
