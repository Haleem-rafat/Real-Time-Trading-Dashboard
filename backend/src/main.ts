import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const logger = new Logger('Bootstrap');

  app.setGlobalPrefix('api/v1');
  app.useGlobalFilters(new HttpExceptionFilter());

  app.enableCors({
    origin: process.env.FRONTEND_URL?.split(',') ?? true,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Real-Time Trading Dashboard API')
    .setDescription('REST + WebSocket API for the trading dashboard')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = Number(process.env.PORT ?? 8080);
  // Bind explicitly to 0.0.0.0 (not the default :: IPv6 wildcard) so Fly's
  // edge proxy can reach the app over IPv4. Without this the container
  // listens on IPv6-only on Alpine and Fly returns 502.
  await app.listen(port, '0.0.0.0');
  logger.log(`🚀 API running on http://0.0.0.0:${port}/api/v1`);
  logger.log(`📚 Swagger docs at http://0.0.0.0:${port}/docs`);
}
void bootstrap();
