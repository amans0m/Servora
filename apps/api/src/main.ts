import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import type { NextFunction, Request, Response } from 'express';

import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { initSentry } from './observability/sentry';

async function bootstrap() {
  // Initialise error monitoring before anything else (no-op without DSN, §A9).
  initSentry();
  // rawBody is needed to verify the Razorpay webhook signature (§6).
  // bufferLogs so early logs go through the redaction logger (§A6).
  const app = await NestFactory.create(AppModule, { bufferLogs: true, rawBody: true });
  app.useLogger(app.get(Logger)); // route all Nest logs through pino (redacted)
  const isProd = process.env.NODE_ENV === 'production';

  // ── Security headers (§A1, §A5) ──
  // HSTS, nosniff, frame-deny, referrer-policy, and a CSP scoped so the only
  // HTML we serve (Swagger UI) still works. The API itself returns JSON.
  app.use(
    helmet({
      hsts: { maxAge: 15552000, includeSubDomains: true, preload: true },
      referrerPolicy: { policy: 'no-referrer' },
      frameguard: { action: 'deny' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          frameAncestors: ["'none'"],
          objectSrc: ["'none'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          // Swagger UI ships inline styles + a small inline bootstrap script.
          styleSrc: ["'self'", "'unsafe-inline'"],
          scriptSrc: ["'self'", "'unsafe-inline'"],
        },
      },
    }),
  );
  const httpAdapter = app.getHttpAdapter().getInstance();
  httpAdapter.disable('x-powered-by');

  // Enforce HTTPS behind a TLS-terminating proxy in production (§A1).
  // (TLS itself + wss:// are terminated at the proxy/load balancer.)
  if (isProd) {
    httpAdapter.set('trust proxy', 1);
    app.use((req: Request, res: Response, next: NextFunction) => {
      if (req.secure || req.headers['x-forwarded-proto'] === 'https') return next();
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    });
  }

  // Strict CORS allowlist — never '*' (§A5). In dev (no CORS_ORIGINS set) we
  // reflect localhost origins only; in prod the allowlist is required.
  const allow = (process.env.CORS_ORIGINS ?? '')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({
    credentials: true,
    origin: (origin, cb) => {
      // Non-browser clients (curl, mobile) send no Origin → allow.
      if (!origin) return cb(null, true);
      if (allow.includes(origin)) return cb(null, true);
      if (!isProd && /^https?:\/\/localhost(:\d+)?$/.test(origin)) return cb(null, true);
      // Deny cleanly: omit the CORS header so the browser blocks it (no 500).
      return cb(null, false);
    },
  });
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  // Consistent DTO validation everywhere (Tech-Stack §3, §9.2 common/)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Consistent error envelope
  app.useGlobalFilters(new AllExceptionsFilter());

  // OpenAPI / Swagger — generates the typed client SDK (Tech-Stack §3)
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Servora API')
    .setDescription('IT-services marketplace — single backend for all four surfaces.')
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
      'access-token',
    )
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  await app.listen(port);
  app.get(Logger).log(`Servora API listening on :${port}/api (docs: /api/docs)`);
}

void bootstrap();
