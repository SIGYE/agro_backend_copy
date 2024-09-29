import { Controller, Get, UseGuards } from '@nestjs/common'
import { AppService } from './app.service'
import { Allow } from './decorators/allow.decorator'

@Allow()
@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello()
  }
}
