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
import { BuyerService } from './buyer.service';
import { CreateBuyerProfileDto, CreateBuyerWithUserDto } from './dto/create-buyer.dto';
import { UpdateBuyerProfileDto } from './dto/update-buyer-profile.dto';
import { OrderStatus, OrderType } from '@prisma/client';
import { JwtAuthGuard } from '../guards/jwt_auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role_Enum } from '../enums/role.enum';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';

@ApiTags('Buyer')
@Controller('buyer')
export class BuyerController {
  constructor(private readonly buyerService: BuyerService) {}

  // ============== PUBLIC ENDPOINTS (NO AUTH REQUIRED) ==============

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register a new buyer (creates user + buyer profile)' })
  @ApiResponse({ status: 201, description: 'Buyer registered successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 409, description: 'User already exists' })
  async registerBuyer(@Body() createBuyerWithUserDto: CreateBuyerWithUserDto) {
    return this.buyerService.registerBuyer(createBuyerWithUserDto);
  }

  // ============== PROTECTED ENDPOINTS (BUYER AUTH REQUIRED) ==============

  @Post('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create buyer profile for existing user' })
  @HttpCode(HttpStatus.CREATED)
  async createProfile(
    @Body() createBuyerProfileDto: CreateBuyerProfileDto,
    @Request() req: any,
  ) {
    return this.buyerService.createProfile(req.user.userId, createBuyerProfileDto);
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get buyer profile' })
  async getProfile(@Request() req: any) {
    return this.buyerService.getProfile(req.user.userId);
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update buyer profile' })
  async updateProfile(
    @Body() updateBuyerProfileDto: UpdateBuyerProfileDto,
    @Request() req: any,
  ) {
    return this.buyerService.updateProfile(req.user.userId, updateBuyerProfileDto);
  }

  // ============== MARKETPLACE ==============

  @Get('marketplace/listings')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Browse crop listings' })
  async browseCropListings(
    @Query('cropTypeId') cropTypeId?: string,
    @Query('locationId') locationId?: string,
    @Query('minPrice') minPrice?: string,
    @Query('maxPrice') maxPrice?: string,
    @Query('sellerType') sellerType?: 'FARMER' | 'COOPERATIVE',
    @Query('cooperativeType') cooperativeType?: 'COLLECTIVE' | 'NON_COLLECTIVE',
    @Query('search') search?: string,
  ) {
    const filters: any = {};

    if (cropTypeId) filters.cropTypeId = cropTypeId;
    if (locationId) filters.locationId = parseInt(locationId);
    if (minPrice) filters.minPrice = parseFloat(minPrice);
    if (maxPrice) filters.maxPrice = parseFloat(maxPrice);
    if (sellerType) filters.sellerType = sellerType;
    if (cooperativeType) filters.cooperativeType = cooperativeType;
    if (search) filters.search = search;

    return this.buyerService.browseCropListings(filters);
  }

  @Get('marketplace/listings/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get crop listing details' })
  async getCropListingDetails(@Param('id') id: string) {
    return this.buyerService.getCropListingDetails(id);
  }

  // ============== ORDERS ==============

  @Get('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get my orders' })
  async getMyOrders(
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

    return this.buyerService.getMyOrders(req.user.userId, filters);
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get order details' })
  async getOrderDetails(@Param('id') id: string, @Request() req: any) {
    return this.buyerService.getOrderDetails(id, req.user.userId);
  }

  @Put('orders/:id/cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel order' })
  async cancelOrder(
    @Param('id') id: string,
    @Body('reason') reason: string,
    @Request() req: any,
  ) {
    return this.buyerService.cancelOrder(id, req.user.userId, reason);
  }

  // ============== STATISTICS ==============

  @Get('statistics')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get buyer statistics' })
  async getStatistics(@Request() req: any) {
    return this.buyerService.getOrderStatistics(req.user.userId);
  }

  @Get('favorites')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role_Enum.BUYER)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get favorite crop types' })
  async getFavorites(@Request() req: any) {
    return this.buyerService.getFavoriteListings(req.user.userId);
  }
}