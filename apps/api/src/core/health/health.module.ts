import { Module } from '@nestjs/common';

import { HealthController } from './health.controller';

// Liveness + readiness probes. DB_CONNECTION is provided by the @Global
// DatabaseModule, so no imports are needed here.
@Module({
  controllers: [HealthController],
})
export class HealthModule {}
