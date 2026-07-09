import { Global, Module } from '@nestjs/common';

import { OpsAlertService } from './ops-alert.service';

// Operational alerting — the ops pager for terminal failures. Global so
// dead-letter handlers and any service can inject it without extra imports.
@Global()
@Module({
  providers: [OpsAlertService],
  exports: [OpsAlertService],
})
export class AlertingModule {}
