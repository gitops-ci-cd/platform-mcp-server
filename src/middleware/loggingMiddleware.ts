import { Request, Response, NextFunction } from 'express';

export const loggingMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  const base = {
    timestamp: new Date().toISOString(),
    method: req.method,
    path: `${req.baseUrl}${req.path}`,
    params: req.query || req.params || {},
    body: req.body || {},
    headers: req.headers,
  };

  // Hook into the response lifecycle to log when it finishes
  res.on("finish", () => {
    const duration = Date.now() - start;
    const log = {
      status: res.statusCode,
      duration: `${duration}ms`,
    };
    console.info(JSON.stringify({ ...base, ...log }));
  });

  // Hook into the response lifecycle to log errors
  res.on("error", (err) => {
    const duration = Date.now() - start;
    const log = {
      status: res.statusCode || 500,
      duration: `${duration}ms`,
      error: err.message,
    };
    console.error(JSON.stringify({ ...base, ...log }));
  });

  next();
};
