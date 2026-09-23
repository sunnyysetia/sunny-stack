import { Global, Module } from '@nestjs/common';

import { AlertingModule } from './alerting/alerting.module.js';
import { AuthModule } from './auth/auth.module.js';
import { DatabaseModule } from './database/database.module.js';
import { PlatformMailModule } from './platform-mail/platform-mail.module.js';
import { QueueModule } from './queue/queue.module.js';
import { StorageModule } from './storage/storage.module.js';

// CoreModule bundles the generic infrastructure every app needs: DB, auth,
// the pg-boss queue singleton, S3 storage, transactional mail, and ops
// alerting. Domain modules import nothing from here directly — the @Global
// infra modules are ambient, and CoreModule re-exports the rest.
@Global()
@Module({
  imports: [
    DatabaseModule,
    AuthModule,
    QueueModule,
    StorageModule,
    PlatformMailModule,
    AlertingModule,
  ],
  exports: [
    DatabaseModule,
    AuthModule,
    QueueModule,
    StorageModule,
    PlatformMailModule,
    AlertingModule,
  ],
})
export class CoreModule {}
