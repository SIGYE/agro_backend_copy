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
import { UpdateCropListingDto } from './dto/update-crop-listing.dto';
import { OrderStatus, OrderType, PaymentMethod, PaymentStatus } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt_auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role_Enum } from '../enums/role.enum';
import { RecordPaymentDto } from './dto/record-payment.dto';

@Controller('orders')
@UseGuards(JwtAuthGuard, RolesGuard)
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // ============== CROP LISTINGS ==============

  @Get('crop-listings/mine')
  @Roles(
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
  )
  async getMyCropListings(@Request() req: any) {
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.getMyCropListings(req.user.id, userRole);
  }

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
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.createCropListing(
      createCropListingDto,
      req.user.id,
      userRole,
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
    @Body() updateData: UpdateCropListingDto,
    @Request() req: any,
  ) {
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.updateCropListing(
      id,
      updateData,
      req.user.id,
      userRole,
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
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.createOrder(
      createOrderDto,
      req.user.id,
      userRole,
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

    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.getOrders(req.user.id, userRole, filters);
  }

  @Get('sales-summary')
  @Roles(
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
  )
  async getSalesSummary(
    @Request() req: any,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const filters: any = {};
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.getSalesSummary(req.user.id, userRole, filters);
  }

  @Get('transactions')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN, Role_Enum.UMUFASHAMYUMVIRE)
  async listTransactions(
    @Request() req: any,
    @Query('status') status?: PaymentStatus,
    @Query('method') method?: PaymentMethod,
    @Query('search') search?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const filters: any = {};
    if (status) filters.status = status;
    if (method) filters.method = method;
    if (search) filters.search = search;
    if (startDate) filters.startDate = new Date(startDate);
    if (endDate) filters.endDate = new Date(endDate);
    if (page) filters.page = parseInt(page);
    if (limit) filters.limit = parseInt(limit);

    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.listTransactions(req.user.id, userRole, filters);
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
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.getOrderById(id, req.user.id, userRole);
  }

  @Get(':id/invoice')
  @Roles(
    Role_Enum.BUYER,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.ADMIN,
    Role_Enum.DEV_ADMIN,
  )
  async getInvoice(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.getInvoice(id, req.user.id, userRole);
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
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.updateOrderStatus(
      id,
      updateOrderStatusDto,
      req.user.id,
      userRole,
    );
  }

  @Post(':id/pickup/confirm')
  @Roles(
    Role_Enum.BUYER,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER,
  )
  async confirmPickup(@Param('id') id: string, @Request() req: any) {
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.confirmPickup(id, req.user.id, userRole);
  }

  @Post(':id/payment')
  @Roles(Role_Enum.BUYER)
  async recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Request() req: any,
  ) {
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.orderService.recordPaymentOutcome(
      id,
      dto,
      req.user.id,
      userRole,
    );
  }
}
