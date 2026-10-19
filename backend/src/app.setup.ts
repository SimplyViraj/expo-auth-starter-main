import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import { HttpExceptionFilter } from './common/filters/http-exception.filter.js';
import { createValidationPipe } from './common/pipes/validation.pipe.js';
import { CacheControlInterceptor } from './common/interceptors/cache-control.interceptor.js';
import { AuthService } from './modules/auth/auth.service.js';
import type { Environment } from './config/env.validation.js';

export async function configureApp(app: INestApplication) {
  const config = app.get(ConfigService<Environment, true>);
  app.setGlobalPrefix('api');
  app.use(helmet());
  app.enableCors({
    origin: [config.get('BETTER_AUTH_URL', { infer: true }), ...config.get('AUTH_TRUSTED_ORIGINS', { infer: true })],
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Cookie', 'expo-origin', 'x-skip-oauth-proxy', 'Authorization'],
  });
  // Better Auth must receive its raw request stream.
  const parseJson = json({ limit: '32kb' });
  app.use((req: import('express').Request, res: import('express').Response, next: import('express').NextFunction) => {
    if (req.path === '/api/auth' || req.path.startsWith('/api/auth/')) return next();
    return parseJson(req, res, next);
  });
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalInterceptors(new CacheControlInterceptor());
  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('Expo Auth Backend').setVersion('1.0.0')
    .addCookieAuth('better-auth.session_token').build());
  const authSchema = await app.get(AuthService).engine.api.generateOpenAPISchema();
  for (const [path, operations] of Object.entries(authSchema.paths)) {
    document.paths['/api/auth' + path] = operations as unknown as typeof document.paths[string];
  }
  const components = document.components ?? {};
  document.components = {
    ...components,
    schemas: { ...components.schemas, ...authSchema.components.schemas } as typeof components.schemas,
    securitySchemes: { ...components.securitySchemes, ...authSchema.components.securitySchemes } as typeof components.securitySchemes,
  };
  SwaggerModule.setup('api/docs', app, document);
  return document;
}
