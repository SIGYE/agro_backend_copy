import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { CreateCropListingDto } from './dto/create-crop-listing.dto';
import { OrderStatus, OrderType } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt_auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role_Enum } from '../enums/role.enum';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ============== CROP LISTINGS ==============

  @Post('crop-listings')
  @Roles(
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
  )
  @HttpCode(HttpStatus.CREATED)
  async createCropListing(
    @Body() createCropListingDto: CreateCropListingDto,
    @Request() req: any,
  ) {
    return this.orderService.createCropListing(
      createCropListingDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Get('crop-listings')
  async getCropListings(
    @Query('cropTypeId') cropTypeId?: string,
    @Query('locationId') locationId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sellerType') sellerType?: 'FARMER' | 'COOPERATIVE',
    @Query('cooperativeType') cooperativeType?: 'COLLECTIVE' | 'NON_COLLECTIVE',
  ) {
    const filters: any = {};

    if (cropTypeId) filters.cropTypeId = cropTypeId;
    if (locationId) filters.locationId = parseInt(locationId);
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (sellerType) filters.sellerType = sellerType;
    if (cooperativeType) filters.cooperativeType = cooperativeType;

    return this.orderService.getCropListings(filters);
  }

  @Put('crop-listings/:id')
  @Roles(
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
  )
  async updateCropListing(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateCropListingDto>,
    @Request() req: any,
  ) {
    return this.orderService.updateCropListing(
      id,
      updateData,
      req.user.userId,
      req.user.role,
    );
  }

  // ============== ORDERS ==============

  @Post()
  @Roles(Role_Enum.BUYER)
  @HttpCode(HttpStatus.CREATED)
  async createOrder(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: any,
  ) {
    return this.orderService.createOrder(
      createOrderDto,
      req.user.userId,
      req.user.role,
    );
  }

  @Get()
  @Roles(
    Role_Enum.BUYER,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.UMUFASHAMYUMVIRE,
  )
  async getOrders(
    @Request() req: any,
    @Query('status') status?: OrderStatus,
    @Query('orderType') orderType?: OrderType,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};

    if (status) filters.status = status;
    if (orderType) filters.orderType = orderType;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);

    return this.orderService.getOrders(
      req.user.userId,
      req.user.role,
      filters,
    );
  }

  @Get(':id')
  @Roles(
    Role_Enum.BUYER,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.UMUFASHAMYUMVIRE,
  )
  async getOrderById(@Param('id') id: string, @Request() req: any) {
    return this.orderService.getOrderById(id, req.user.userId, req.user.role);
  }

  @Put(':id/status')
  @Roles(
    Role_Enum.BUYER,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.UMUFASHAMYUMVIRE,
  )
  async updateOrderStatus(
    @Param('id') id: string,
    @Body() updateOrderStatusDto: UpdateOrderStatusDto,
    @Request() req: any,
  ) {
    return this.orderService.updateOrderStatus(
      id,
      updateOrderStatusDto,
      req.user.userId,
      req.user.role,
    );
  }
}