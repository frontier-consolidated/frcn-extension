enum Level {
  Debug,
  Info,
  Warn,
  Error,
}

const logStyles = {
  debug: 'color: #9AA2AA',
  info: 'color: #659AD2',
  warn: 'color: #F9C749',
  error: 'color: #EC3D47',
}

const methodsMap = {
  debug: typeof console.debug !== "undefined" ? 'debug' : 'log',
  info: typeof console.info !== "undefined" ? 'info' : 'log',
  warn: typeof console.warn !== "undefined" ? 'warn' : 'log',
  error: typeof console.error !== "undefined" ? 'error' : 'log',
}

type LoggerConfig = {
    level: keyof typeof Level;
    threshold: Level;
    prefix: string;
}

type LoggerOptions = {
    level?: keyof typeof Level;
    prefix?: string;
}

type LoggerMethods = {
    [Key in Lowercase<NonNullable<keyof typeof Level>>]: (msg: string | object, data?: object) => void;
}

export interface Logger extends LoggerMethods {}

export class Logger {
    private config: LoggerConfig;

    constructor(options: LoggerOptions = {}) {
        const { level = "Info", prefix = '' } = options

        this.config = {
            level,
            prefix,
            threshold: Level[level],
        }

        for (const key of Object.keys(Level)) {
            const levelKey = key.toLowerCase() as Lowercase<keyof typeof Level>
            this[levelKey] = (message, data) => this.log(Level[key as keyof typeof Level], message, data)
        }
    }

    log(level: Level, messageOrData: string | object, data?: object) {
        const { threshold, prefix } = this.config;
        if (level < threshold) return;

        const levelKey = Level[level].toLowerCase() as keyof typeof methodsMap
        const method = methodsMap[levelKey] as "log" | "info" | "debug" | "warn" | "error"
        
        console[method](`%c ${prefix ? `[${prefix}] ` : ""}[${Level[level].toUpperCase()}]`, logStyles[levelKey], typeof messageOrData === "object" ? messageOrData : `${messageOrData}${data ? " " : ""}`, data ? data : "")
    }
}

const logger = new Logger({ prefix: "FRCN Extension", level: "Debug" })
export default logger;
