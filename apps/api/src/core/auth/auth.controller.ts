import { Controller, Get } from '@nestjs/common';

@Controller('auth')
export class AuthController {
  constructor() {}

  @Get('ok')
  getHello(): string {
    return 'hello';
  }
}
