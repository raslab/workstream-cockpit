type LogLevel = 'info' | 'warn' | 'error' | 'debug';

class Logger {
  private getTimestamp(): string {
    return new Date().toISOString();
  }

  private log(level: LogLevel, message: string): void {
    const timestamp = this.getTimestamp();
    const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

    switch (level) {
      case 'error':
        console.error(logMessage);
        break;
      case 'warn':
        console.warn(logMessage);
        break;
      case 'debug':
        if (process.env.LOG_LEVEL === 'debug') {
          console.debug(logMessage);
        }
        break;
      default:
        console.log(logMessage);
    }
  }

  info(message: string): void {
    this.log('info', message);
  }

  warn(message: string): void {
    this.log('warn', message);
  }

  error(message: string, error?: unknown): void {
    let fullMessage = message;
    if (error) {
      if (error instanceof Error) {
        fullMessage += ` ${error.message}\n${error.stack}`;
      } else {
        fullMessage += ` ${JSON.stringify(error)}`;
      }
    }
    this.log('error', fullMessage);
  }

  debug(message: string): void {
    this.log('debug', message);
  }
}

export const logger = new Logger();
