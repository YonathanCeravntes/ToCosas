import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  // rawBody: true permite validar la firma HMAC del webhook de WhatsApp sobre
  // el cuerpo crudo (req.rawBody), antes de que Express lo re-serialice.
  const app = await NestFactory.create(AppModule, { rawBody: true });

  app.setGlobalPrefix('v1');
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  app.enableCors();

  const config = new DocumentBuilder()
    .setTitle('ToCosas API')
    .setDescription('API de finanzas personales con foco en deudas e integración WhatsApp')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('v1/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`ToCosas backend escuchando en http://localhost:${port}/v1`);
}

void bootstrap();
