import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { apiReference } from '@scalar/nestjs-api-reference';
import basicAuth from 'express-basic-auth';
import { AppModule } from './app.module';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useLogger(app.get(WINSTON_MODULE_NEST_PROVIDER));

  // Enable CORS for localhost:3000 with member and admin prefixes
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'https://arisan-iphone-service.zeabur.app',
      'https://ariphone.online'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  const config = new DocumentBuilder()
    .setTitle('Arisan iPhone Service')
    .setDescription('API for managing arisan groups, tickets, payments, and draws')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
      'JWT',
    )
    .addTag('Auth', 'Authentication endpoints (register, login)')
    .addTag('Users', 'User profile management')
    .addTag('Groups', 'Group management and member operations')
    .addTag('Tickets', 'Ticket purchasing')
    .addTag('Payments', 'Payment processing and verification')
    .addTag('Draws', 'Draw/lottery management')
    .build();

  const document = SwaggerModule.createDocument(app, config);

  app.use(
    '/docs',
    basicAuth({
      users: {
        [process.env.DOCS_USERNAME || 'admin']: process.env.DOCS_PASSWORD || 'admin',
      },
      challenge: true,
    }),
    apiReference({
      content: document,
      theme: 'kepler',
    }),
  );

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
