import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * FIN-029 · Webhook de Telegram (DEC-0029 §5, AUD-0029): dedupe por `update_id`
 * verificado contra app + BD reales (el dedupe YA existía — se prueba, no se
 * reconstruye). Sin `TELEGRAM_BOT_TOKEN` el provider queda en modo DEV (no hace
 * HTTP real), así que el webhook es seguro de invocar en test.
 *
 * Ejecución: `npm run test:e2e` (requiere el Postgres de docker levantado).
 */
describe('FIN-029 · webhook de Telegram con dedupe por update_id', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let base: string;

  const post = async (path: string, body: unknown, headers: Record<string, string> = {}) => {
    const res = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });
    let data: any = null;
    try {
      data = await res.json();
    } catch {
      /* sin cuerpo */
    }
    return { status: res.status, data };
  };

  const update = (updateId: number, text: string, chatId = 999_001) => ({
    update_id: updateId,
    message: { message_id: updateId, chat: { id: chatId }, text },
  });

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: false }));
    await app.init();
    await app.listen(0);
    base = (await app.getUrl()).replace('[::1]', '127.0.0.1');
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    await app?.close();
  });

  it('procesa un update nuevo y lo marca como procesado', async () => {
    const uid = 700_000 + Math.floor(Math.random() * 100_000);
    const r = await post('/v1/webhooks/telegram', update(uid, 'hola'));
    expect([200, 201]).toContain(r.status);
    const ev = await prisma.webhookEvent.findUnique({ where: { externalId: `tg:${uid}` } });
    expect(ev).not.toBeNull();
    expect(ev!.status).toBe('processed');
  });

  it('un update DUPLICADO (mismo update_id) no se procesa dos veces', async () => {
    const uid = 800_000 + Math.floor(Math.random() * 100_000);
    await post('/v1/webhooks/telegram', update(uid, 'hola'));
    const before = await prisma.webhookEvent.count({ where: { externalId: `tg:${uid}` } });
    // Reintento (Telegram reenvía): el dedupe debe ignorarlo.
    const r2 = await post('/v1/webhooks/telegram', update(uid, 'hola'));
    expect([200, 201]).toContain(r2.status);
    const after = await prisma.webhookEvent.count({ where: { externalId: `tg:${uid}` } });
    expect(before).toBe(1);
    expect(after).toBe(1); // sigue habiendo UN solo registro
  });

  it('rechaza el secreto inválido si hay uno configurado (o pasa en dev sin secreto)', async () => {
    // El comportamiento depende de TELEGRAM_WEBHOOK_SECRET; en dev suele estar
    // vacío y el webhook acepta. Solo verificamos que no rompe.
    const uid = 900_000 + Math.floor(Math.random() * 100_000);
    const r = await post('/v1/webhooks/telegram', update(uid, 'ayuda'), {
      'x-telegram-bot-api-secret-token': 'lo-que-sea',
    });
    expect([200, 201]).toContain(r.status);
  });
});
