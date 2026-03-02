import { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';

export const trustedOrigins = [
  'https://dashboard.withslab.com',
  'https://withslab.com',
  ...(process.env.NODE_ENV !== 'production' ? ['http://localhost:3000'] : []),
];

export const corsConfig: CorsOptions = {
  origin: trustedOrigins,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

export default corsConfig;
