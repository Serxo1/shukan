const isDev = import.meta.env.DEV;

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface Logger {
  debug: (...args: unknown[]) => void;
  info: (...args: unknown[]) => void;
  warn: (...args: unknown[]) => void;
  error: (...args: unknown[]) => void;
}

function createLogger(namespace: string): Logger {
  const prefix = `[${namespace}]`;

  const log = (level: LogLevel, ...args: unknown[]) => {
    if (!isDev && level !== 'error') return;

    const method = level === 'debug' ? 'log' : level;
    console[method](prefix, ...args);
  };

  return {
    debug: (...args) => log('debug', ...args),
    info: (...args) => log('info', ...args),
    warn: (...args) => log('warn', ...args),
    error: (...args) => log('error', ...args),
  };
}

// Pre-configured loggers for different modules
export const dbLogger = createLogger('Database');
export const syncLogger = createLogger('CloudSync');
export const agentLogger = createLogger('HabitAgent');
export const authLogger = createLogger('Auth');
export const uiLogger = createLogger('UI');

export { createLogger };
