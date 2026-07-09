import { Global, Module } from '@nestjs/common';

import { AlertingModule } from './alerting/alerting.module';
import { AuthModule } from './auth/auth.module';
import { DatabaseModule } from './database/database.module';
import { PlatformMailModule } from './platform-mail/platform-mail.module';
import { QueueModule } from './queue/queue.module';
import { StorageModule } from './storage/storage.module';

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
