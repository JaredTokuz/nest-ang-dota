import { Controller, Get } from '@nestjs/common';

@Controller('ping')
export class PingController {
  constructor() {}

  @Get()
  ping() {
    return 'Hello World';
  }
}
