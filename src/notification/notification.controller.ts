import { Controller, Get, Param, Put, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { ApiResponse } from 'src/responses/api.response';
import { NotificationService } from './notification.service';
import { AuthRequest } from 'src/types/auth-request.type';
import { JwtAuthGuard } from 'src/guards/jwt_auth.guard';
import { RolesGuard } from 'src/guards/roles.guard';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  async list(
    @Req() req: AuthRequest,
    @Query('unreadOnly') unreadOnly?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const userId = req.user.id;
      const data = await this.notificationService.listForUser(userId, {
        unreadOnly: unreadOnly === 'true',
        page: page ? Number(page) : 1,
        limit: limit ? Number(limit) : 20,
      });
      return new ApiResponse(true, 'Success', data as any, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('unread-count')
  async unreadCount(@Req() req: AuthRequest) {
    try {
      const userId = req.user.id;
      const data = await this.notificationService.unreadCount(userId);
      return new ApiResponse(true, 'Success', { count: data }, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put(':id/read')
  async markRead(@Req() req: AuthRequest, @Param('id') id: string) {
    try {
      const userId = req.user.id;
      const data = await this.notificationService.markRead(userId, id);
      return new ApiResponse(true, 'Success', data as any, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Put('read-all')
  async markAllRead(@Req() req: AuthRequest) {
    try {
      const userId = req.user.id;
      const data = await this.notificationService.markAllRead(userId);
      return new ApiResponse(true, 'Success', data as any, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}
