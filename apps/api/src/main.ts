import { NestFactory } from '@nestjs/core';

// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
// import { generateOpenApiSpecs } from './common/utils/openapi';
import corsConfig from './config/cors.config';
import { TrpcContextFactory } from './trpc/trpc-context.factory';
import { appRouter } from './trpc/app.router';
import * as trpcExpress from '@trpc/server/adapters/express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(corsConfig);

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
