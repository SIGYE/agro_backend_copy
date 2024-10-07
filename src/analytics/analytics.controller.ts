import { Controller, Get } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { ApiTags } from '@nestjs/swagger';

@Controller('analytics')
@ApiTags('Analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {
  }
  @Get()
  async getAnalytics() {
    return 'hello'
  }
}
