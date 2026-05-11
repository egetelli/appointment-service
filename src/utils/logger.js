const winston = require("winston");
const path = require("path");
const { requestContext } = require("../middleware/loggerContext");

// Winston'a özel, görünmez depodan veri çeken format
const addContextData = winston.format((info) => {
  const store = requestContext.getStore();

  if (store) {
    // Depodaki verileri doğrudan log nesnesine yapıştır
    info.traceId = store.get("traceId");
    info.userId = store.get("userId") || "GUEST";
    info.ip = store.get("ip");
    info.method = store.get("method");
    info.url = store.get("url");
  }
  return info;
});

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  addContextData(), 
  winston.format.json(),
);

const logDir = path.resolve(__dirname, "../../logs");

const logger = winston.createLogger({
  level: "info",
  format: logFormat,
  transports: [
    new winston.transports.File({
      filename: path.join(logDir, "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join(logDir, "combined.log"),
    }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
  ],
});

module.exports = logger;
