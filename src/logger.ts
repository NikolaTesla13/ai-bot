import { createLogger, format, transports } from "winston";
const util = require("util");

function transform(info: any, _opts: any) {
  const args = info[Symbol.for("splat")];
  if (args) {
    info.message = util.format(info.message, ...args);
  }
  return info;
}

function utilFormatter() {
  return { transform };
}

export const logger = createLogger({
  level: "info",
  format: format.combine(
    utilFormatter(),
    format.colorize(),
    format.printf(({ level, message }) => `${level}: ${message}`)
  ),
  defaultMeta: { service: "lisa" },
  transports: [
    new transports.Stream({
      stream: process.stderr,
      level: "debug",
    }),
  ],
});
