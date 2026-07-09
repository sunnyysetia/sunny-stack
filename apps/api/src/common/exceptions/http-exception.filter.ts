import { ArgumentsHost, Catch, HttpException } from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';
import { ZodSerializationException } from 'nestjs-zod';
import { ZodError } from 'zod';

import { getLogger } from '@/core/logging';

const logger = getLogger('HttpExceptionFilter');

// Extends the default Nest exception filter to add structured logging for
// response-serialization failures — a Zod schema on a controller response
// rejecting the shape the handler returned. Everything else falls through to
// the base filter's standard HTTP error rendering.
@Catch(HttpException)
export class HttpExceptionFilter extends BaseExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    if (exception instanceof ZodSerializationException) {
      const zodError = exception.getZodError();
      if (zodError instanceof ZodError) {
        logger.error({ err: zodError }, 'response serialization failed Zod validation');
      }
    }

    super.catch(exception, host);
  }
}
