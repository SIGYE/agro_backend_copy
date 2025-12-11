import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateBuyerProfileDto, CreateBuyerWithUserDto } from './dto/create-buyer.dto';
import { UpdateBuyerProfileDto } from './dto/update-buyer-profile.dto';
import { OrderStatus, OrderType, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class BuyerService {
  constructor(private readonly databaseService: DatabaseService) {}

  // ============== BUYER REGISTRATION (CREATE USER + BUYER PROFILE) ==============

  async registerBuyer(dto: CreateBuyerWithUserDto) {
    try {
      // Check if user already exists with email or telephone
      if (dto.user.email) {
        const existingUserByEmail = await this.databaseService.user.findUnique({
          where: { email: dto.user.email },
        });
        if (existingUserByEmail) {
          throw new ConflictException('User with this email already exists');
        }
      }

      if (dto.user.telephone) {
        const existingUserByTelephone = await this.databaseService.user.findUnique({
          where: { telephone: dto.user.telephone },
        });
        if (existingUserByTelephone) {
          throw new ConflictException('User with this telephone already exists');
        }
      }

      // Get buyer role
      const buyerRole = await this.databaseService.role.findFirst({
        where: { name: 'BUYER' },
      });

      if (!buyerRole) {
        throw new NotFoundException('BUYER role not found in the system');
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(dto.user.password, 10);

      // Parse date of birth
      const dob = dto.user.dob ? new Date(dto.user.dob) : undefined;

      // Create user and buyer profile in a transaction
      const result = await this.databaseService.$transaction(async (prisma) => {
        // Create user with proper Prisma typing
        const user = await prisma.user.create({
          data: {
            firstName: dto.user.firstName,
            lastName: dto.user.lastName,
            nationalId: dto.user.nationalId,
            telephone: dto.user.telephone,
            gender: dto.user.gender,
            email: dto.user.email,
            dob: dob,
            password: hashedPassword,
            username: dto.user.username || `${dto.user.firstName.toLowerCase()}.${dto.user.lastName.toLowerCase()}.${Date.now()}`,
            roleId: buyerRole.id,
            locationId: dto.user.locationId,
          },
        });

        // Create buyer profile
        const buyer = await prisma.buyer.create({
          data: {
            userId: user.id,
            businessName: dto.buyer.businessName,
            businessType: dto.buyer.businessType,
            tin: dto.buyer.tin,
            address: dto.buyer.address,
            preferredPayment: dto.buyer.preferredPayment,
          },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                telephone: true,
                gender: true,
                dob: true,
              },
            },
          },
        });

        return buyer;
      });

      return {
        message: 'Buyer registered successfully',
        data: result,
      };
    } catch (error) {
      if (
        error instanceof ConflictException ||
        error instanceof NotFoundException
      ) {
        throw error;
      }
      throw new BadRequestException('Error registering buyer: ' + error.message);
    }
  }

   async createProfile(userId: string, dto: CreateBuyerProfileDto) {
    try {
      // Check if user exists
      const user = await this.databaseService.user.findUnique({
        where: { id: userId },
      });

      if (!user) {
        throw new NotFoundException('User not found');
      }

      // Check if profile already exists
      const existing = await this.databaseService.buyer.findUnique({
        where: { userId },
      });

      if (existing) {
        throw new ConflictException('Buyer profile already exists');
      }

      // Create buyer profile
      return await this.databaseService.buyer.create({
        data: {
          userId,
          businessName: dto.businessName,
          businessType: dto.businessType,
          tin: dto.tin,
          address: dto.address,
          preferredPayment: dto.preferredPayment,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              telephone: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof ConflictException || error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Error creating buyer profile: ' + error.message);
    }
  }

async getProfile(userId: string) {
    try {
      const profile = await this.databaseService.buyer.findUnique({
        where: { userId },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              telephone: true,
              gender: true,
              dob: true,
              location: {
                select: {
                  id: true,
                  name: true,
                  locationLevel: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  parentLocation: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!profile) {
        throw new NotFoundException('Buyer profile not found');
      }

      return profile;
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error fetching buyer profile: ' + error.message);
    }
  } 

 async updateProfile(userId: string, dto: UpdateBuyerProfileDto) {
    try {
      const profile = await this.databaseService.buyer.findUnique({
        where: { userId },
      });

      if (!profile) {
        throw new NotFoundException('Buyer profile not found');
      }

      return await this.databaseService.buyer.update({
        where: { userId },
        data: {
          businessName: dto.businessName,
          businessType: dto.businessType,
          tin: dto.tin,
          address: dto.address,
          preferredPayment: dto.preferredPayment,
        },
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              telephone: true,
            },
          },
        },
      });
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Error updating buyer profile: ' + error.message);
    }
  }

  // ============== MARKETPLACE BROWSING ==============

  async browseCropListings(filters?: {
    cropTypeId?: string;
    locationId?: number;
    minPrice?: number;
    maxPrice?: number;
    sellerType?: 'FARMER' | 'COOPERATIVE';
    cooperativeType?: 'COLLECTIVE' | 'NON_COLLECTIVE';
    search?: string;
  }) {
    try {
      const whereClause: any = {
        isActive: true,
        availableKg: { gt: 0 },
      };

      if (filters?.cropTypeId) {
        whereClause.cropTypeId = filters.cropTypeId;
      }

      if (filters?.locationId) {
        whereClause.locationId = filters.locationId;
      }

      if (filters?.minPrice || filters?.maxPrice) {
        whereClause.pricePerKg = {};
        if (filters.minPrice) whereClause.pricePerKg.gte = filters.minPrice;
        if (filters.maxPrice) whereClause.pricePerKg.lte = filters.maxPrice;
      }

      if (filters?.sellerType === 'FARMER') {
        whereClause.farmerId = { not: null };
      } else if (filters?.sellerType === 'COOPERATIVE') {
        whereClause.cooperativeId = { not: null };
      }

      if (filters?.cooperativeType) {
        whereClause.cooperative = {
          collectiveType: filters.cooperativeType,
        };
      }

      if (filters?.search) {
        whereClause.OR = [
          { cropType: { name: { contains: filters.search, mode: 'insensitive' } } },
          { cropType: { crop: { name: { contains: filters.search, mode: 'insensitive' } } } },
        ];
      }

      return await this.databaseService.cropListing.findMany({
        where: whereClause,
        include: {
          cropType: {
            include: { crop: true },
          },
          location: true,
          farmer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  telephone: true,
                },
              },
            },
          },
          cooperative: {
            select: {
              id: true,
              name: true,
              telephone: true,
              type: true,
              collectiveType: true,
            },
          },
        },
        orderBy: { pricePerKg: 'asc' },
      });
    } catch (error) {
      throw new BadRequestException('Error browsing crop listings: ' + error.message);
    }
  }

  async getCropListingDetails(listingId: string) {
    try {
      const listing = await this.databaseService.cropListing.findUnique({
        where: { id: listingId },
        include: {
          cropType: {
            include: { crop: true },
          },
          location: true,
          farmer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  telephone: true,
                },
              },
            },
          },
          cooperative: {
            select: {
              id: true,
              name: true,
              telephone: true,
              type: true,
              collectiveType: true,
              Location: true,
            },
          },
        },
      });

      if (!listing) {
        throw new NotFoundException('Crop listing not found');
      }

      if (!listing.isActive || listing.availableKg <= 0) {
        throw new BadRequestException('This listing is no longer available');
      }

      return listing;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error fetching listing details: ' + error.message);
    }
  }

  // ============== ORDER MANAGEMENT ==============

  async getMyOrders(
    userId: string,
    filters?: {
      status?: OrderStatus;
      orderType?: OrderType;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    try {
      const whereClause: any = {
        buyerId: userId,
      };

      if (filters?.status) {
        whereClause.status = filters.status;
      }

      if (filters?.orderType) {
        whereClause.orderType = filters.orderType;
      }

      if (filters?.startDate || filters?.endDate) {
        whereClause.createdAt = {};
        if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
        if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
      }

      return await this.databaseService.order.findMany({
        where: whereClause,
        include: {
          farmer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  telephone: true,
                },
              },
            },
          },
          cooperative: {
            select: {
              name: true,
              telephone: true,
            },
          },
          orderItems: {
            include: {
              cropListing: {
                include: {
                  cropType: {
                    include: { crop: true },
                  },
                },
              },
            },
          },
          statusHistory: {
            orderBy: { createdAt: 'desc' },
            take: 5,
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    } catch (error) {
      throw new BadRequestException('Error fetching orders: ' + error.message);
    }
  }

  async getOrderDetails(orderId: string, userId: string) {
    try {
      const order = await this.databaseService.order.findUnique({
        where: { id: orderId },
        include: {
          farmer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  telephone: true,
                },
              },
            },
          },
          cooperative: {
            select: {
              name: true,
              telephone: true,
            },
          },
          orderItems: {
            include: {
              cropListing: {
                include: {
                  cropType: {
                    include: { crop: true },
                  },
                  location: true,
                },
              },
            },
          },
          statusHistory: {
            include: {
              changedByUser: {
                select: {
                  firstName: true,
                  lastName: true,
                },
              },
            },
            orderBy: { createdAt: 'desc' },
          },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.buyerId !== userId) {
        throw new ForbiddenException('You can only view your own orders');
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error fetching order details: ' + error.message);
    }
  }

  async cancelOrder(orderId: string, userId: string, reason?: string) {
    try {
      const order = await this.databaseService.order.findUnique({
        where: { id: orderId },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.buyerId !== userId) {
        throw new ForbiddenException('You can only cancel your own orders');
      }

      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException(
          'Only pending orders can be cancelled. Current status: ' + order.status
        );
      }

      // Restore crop listing quantities
      const orderItems = await this.databaseService.orderItem.findMany({
        where: { orderId },
        include: { cropListing: true },
      });

      for (const item of orderItems) {
        await this.databaseService.cropListing.update({
          where: { id: item.cropListingId },
          data: {
            availableKg: item.cropListing.availableKg + item.quantityKg,
          },
        });
      }

      // Update order status
      await this.databaseService.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.CANCELLED },
      });

      // Create status history
      await this.databaseService.orderStatusHistory.create({
        data: {
          orderId,
          status: OrderStatus.CANCELLED,
          notes: reason || 'Order cancelled by buyer',
          changedByUserId: userId,
        },
      });

      return { message: 'Order cancelled successfully' };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Error cancelling order: ' + error.message);
    }
  }

  // ============== ORDER STATISTICS ==============

  async getOrderStatistics(userId: string) {
    try {
      const [
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalSpent,
      ] = await Promise.all([
        this.databaseService.order.count({ where: { buyerId: userId } }),
        this.databaseService.order.count({
          where: { buyerId: userId, status: OrderStatus.PENDING },
        }),
        this.databaseService.order.count({
          where: { buyerId: userId, status: OrderStatus.CONFIRMED },
        }),
        this.databaseService.order.count({
          where: { buyerId: userId, status: OrderStatus.PROCESSING },
        }),
        this.databaseService.order.count({
          where: { buyerId: userId, status: OrderStatus.SHIPPED },
        }),
        this.databaseService.order.count({
          where: { buyerId: userId, status: OrderStatus.DELIVERED },
        }),
        this.databaseService.order.count({
          where: { buyerId: userId, status: OrderStatus.CANCELLED },
        }),
        this.databaseService.order.aggregate({
          where: {
            buyerId: userId,
            status: { in: [OrderStatus.CONFIRMED, OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          },
          _sum: { totalAmount: true },
        }),
      ]);

      return {
        totalOrders,
        pendingOrders,
        confirmedOrders,
        processingOrders,
        shippedOrders,
        deliveredOrders,
        cancelledOrders,
        totalSpent: totalSpent._sum.totalAmount || 0,
      };
    } catch (error) {
      throw new BadRequestException('Error fetching statistics: ' + error.message);
    }
  }

  // ============== FAVORITES / WISHLIST ==============

  async getFavoriteListings(userId: string) {
    try {
      const recentOrders = await this.databaseService.order.findMany({
        where: { buyerId: userId },
        include: {
          orderItems: {
            include: {
              cropListing: {
                include: {
                  cropType: { include: { crop: true } },
                  farmer: { include: { user: true } },
                  cooperative: true,
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 10,
      });

      // Extract unique crop types from recent orders
      const uniqueCropTypes = new Map();
      
      recentOrders.forEach(order => {
        order.orderItems.forEach(item => {
          if (!uniqueCropTypes.has(item.cropTypeId)) {
            uniqueCropTypes.set(item.cropTypeId, item.cropListing.cropType);
          }
        });
      });

      return Array.from(uniqueCropTypes.values());
    } catch (error) {
      throw new BadRequestException('Error fetching favorite listings: ' + error.message);
    }
  }
}

