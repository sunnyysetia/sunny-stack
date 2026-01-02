import { NestFactory } from '@nestjs/core';
import * as trpcExpress from '@trpc/server/adapters/express';

import corsConfig from './config/cors.config';
import { appRouter } from './trpc/app.router';
import { TrpcContextFactory } from './trpc/context.factory';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(corsConfig);

  // Setup TRPC
  const ctxFactory = app.get(TrpcContextFactory);

  app.use(
    '/trpc',
    trpcExpress.createExpressMiddleware({
      router: appRouter,
      createContext: ({ req }) => ctxFactory.create(req),
    }),
  );

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
