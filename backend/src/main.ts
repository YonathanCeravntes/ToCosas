import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { assertProductionConfig, corsOriginCheck } from './bootstrap.util';

async function bootstrap() {
  // INFRA-001: en producción no se arranca con secretos de desarrollo (un JWT firmado con
  // "dev-access-secret" abriría cualquier cuenta). Render deja vivo el despliegue anterior
  // si este falla, así que fallar aquí es seguro.
  assertProductionConfig(process.env);

  // rawBody: true permite validar la firma HMAC del webhook de WhatsApp sobre
  // el cuerpo crudo (req.rawBody), antes de que Express lo re-serialice.
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { rawBody: true });

  // INFRA-001: Render pone un proxy delante; sin esto todas las peticiones parecen venir de
  // la misma IP y el límite de intentos de login (5/min) se compartía entre TODOS los usuarios.
  app.set('trust proxy', 1);
  // Cierre ordenado en cada despliegue (Prisma suelta sus conexiones).
  app.enableShutdownHooks();

  app.setGlobalPrefix('v1');
  // Hardening (FIN-009 / DEC-0009 §4.10): cabeceras de seguridad estándar.
  app.use(helmet());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true }),
  );
  // INFRA-001: CORS restringido. La app instalada y los webhooks no envían `Origin` (pasan);
  // los navegadores solo desde la web de Millo y desarrollo local, o lo que diga CORS_ORIGINS.
  app.enableCors({ origin: corsOriginCheck(process.env.CORS_ORIGINS), credentials: false });

  // La documentación de la API no se publica en producción salvo que se pida (ENABLE_API_DOCS).
  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_API_DOCS === 'true') {
    const config = new DocumentBuilder()
      .setTitle('Millo API')
      .setDescription('API de finanzas personales con foco en deudas e integración WhatsApp')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('v1/docs', app, document);
  }

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Millo backend escuchando en http://localhost:${port}/v1`);
}

void bootstrap();
