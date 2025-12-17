import { NestFactory } from '@nestjs/core';

// import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
// import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app.module';
// import { generateOpenApiSpecs } from './common/utils/openapi';
import corsConfig from './config/cors.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors(corsConfig);

  await app.listen(process.env.PORT ?? 8000);
}
bootstrap().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
