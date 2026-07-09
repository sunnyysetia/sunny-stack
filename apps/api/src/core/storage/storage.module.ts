import { Global, Module } from '@nestjs/common';

import { ObjectStorageService } from './object-storage.service';

// `ObjectStorageService` is the canonical S3 wrapper. Global so any module can
// inject it without re-importing.
@Global()
@Module({
  providers: [ObjectStorageService],
  exports: [ObjectStorageService],
})
export class StorageModule {}
