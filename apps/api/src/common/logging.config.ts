import { randomUUID } from 'node:crypto';
import type { Params } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';

/**
 * Redaction logger config (§A6). Never logs bodies, tokens, OTPs, payment data
 * or PII/keys. Every request gets a correlation id (echoed as a response
 * header) so a client error can be traced to server logs without leaking
 * detail. Verbose logging is disabled outside development.
 */
export function loggerConfig(): Params {
  const env = process.env.NODE_ENV ?? 'development';
  const level =
    env === 'production' ? 'info' : env === 'test' ? 'silent' : 'debug';

  return {
    pinoHttp: {
      level,
      // Correlation id: reuse an inbound id or mint one; echo it back.
      genReqId: (req: IncomingMessage, res: ServerResponse) => {
        const existing =
          (req.headers['x-request-id'] as string | undefined) ??
          (req.headers['x-correlation-id'] as string | undefined);
        const id = existing ?? randomUUID();
        res.setHeader('x-correlation-id', id);
        return id;
      },
      // Strip sensitive material from the auto request/response logs.
      redact: {
        paths: [
          'req.headers.authorization',
          'req.headers.cookie',
          'req.headers["x-signature"]',
          'req.headers["x-device-id"]',
          'req.body',
          'res.headers["set-cookie"]',
        ],
        remove: true,
      },
      // Only log method/url/id for requests, status for responses — no body.
      serializers: {
        req(req: { method: string; url: string; id: string }) {
          return { id: req.id, method: req.method, url: req.url };
        },
        res(res: { statusCode: number }) {
          return { statusCode: res.statusCode };
        },
      },
      autoLogging: true,
    },
  };
}
