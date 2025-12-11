import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { OrderStatus, OrderType } from '@prisma/client';
import { CreateCropListingDto } from './dto/create-crop-listing.dto';
import { Role_Enum } from '../enums/role.enum';

@Injectable()
export class OrderService {
  constructor(private readonly databaseService: DatabaseService) {}

  // Helper to generate order number
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  }

  // ---------------- CROP LISTINGS ----------------

  async createCropListing(
    createCropListingDto: CreateCropListingDto,
    userId: string,
    userRole: string
  ) {
    try {
      // Determine if user is farmer or cooperative manager
      let farmerId: string | null = null;
      let cooperativeId: string | null = null;

      if (userRole === Role_Enum.FARMER) {
        // Get farmer for this user
        const farmer = await this.databaseService.farmer.findFirst({
          where: { userId },
        });
        
        if (!farmer) {
          throw new ForbiddenException('User is not registered as a farmer');
        }
        
        farmerId = farmer.id;
        
        // Check if farmer already has a listing for this crop type
        const existingListing = await this.databaseService.cropListing.findUnique({
          where: { farmerId_cropTypeId: { farmerId, cropTypeId: createCropListingDto.cropTypeId } },
        });
        
        if (existingListing) {
          throw new BadRequestException('You already have a listing for this crop type');
        }

      } else if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
                 userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        // Get cooperative managed by this user
        const cooperative = await this.databaseService.cooperative.findFirst({
          where: { cooperativeManagerId: userId },
        });
        
        if (!cooperative) {
          throw new ForbiddenException('User is not a cooperative manager');
        }
        
        cooperativeId = cooperative.id;
        
        // Check if cooperative already has a listing for this crop type
        const existingListing = await this.databaseService.cropListing.findUnique({
          where: { cooperativeId_cropTypeId: { cooperativeId, cropTypeId: createCropListingDto.cropTypeId } },
        });
        
        if (existingListing) {
          throw new BadRequestException('Your cooperative already has a listing for this crop type');
        }

        // For collective cooperatives, verify crop is registered with cooperative
        if (cooperative.collectiveType === 'COLLECTIVE') {
          const cropRegistered = await this.databaseService.cooperativeCropRegistration.findFirst({
            where: {
              cooperativeId,
              cropTypeId: createCropListingDto.cropTypeId,
            },
          });
          
          if (!cropRegistered) {
            throw new BadRequestException('This crop type is not registered with your cooperative');
          }
        }
      } else {
        throw new ForbiddenException('Only farmers and cooperative managers can create crop listings');
      }

      // Validate crop type exists
      const cropType = await this.databaseService.cropType.findUnique({
        where: { id: createCropListingDto.cropTypeId },
        include: { crop: true },
      });
      
      if (!cropType) {
        throw new NotFoundException('Crop type not found');
      }

      // Create crop listing
      return await this.databaseService.cropListing.create({
        data: {
          cropTypeId: createCropListingDto.cropTypeId,
          pricePerKg: createCropListingDto.pricePerKg,
          currency: createCropListingDto.currency,
          totalAvailableKg: createCropListingDto.totalAvailableKg,
          availableKg: createCropListingDto.totalAvailableKg,
          minimumOrderKg: createCropListingDto.minimumOrderKg,
          locationId: createCropListingDto.locationId,
          isActive: createCropListingDto.isActive,
          farmerId,
          cooperativeId,
        },
        include: {
          cropType: {
            include: { crop: true },
          },
          location: true,
          farmer: {
            include: { user: true },
          },
          cooperative: true,
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error creating crop listing: ' + error.message);
    }
  }

  async updateCropListing(
    listingId: string,
    updateData: Partial<CreateCropListingDto>,
    userId: string,
    userRole: string
  ) {
    try {
      const listing = await this.databaseService.cropListing.findUnique({
        where: { id: listingId },
        include: {
          farmer: { include: { user: true } },
          cooperative: { include: { cooperativeManager: true } },
        },
      });
      
      if (!listing) {
        throw new NotFoundException('Crop listing not found');
      }

      // Check authorization
      if (userRole === Role_Enum.FARMER) {
        if (!listing.farmer || listing.farmer.user.id !== userId) {
          throw new ForbiddenException('You can only update your own crop listings');
        }
      } else if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
                 userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        if (!listing.cooperative || listing.cooperative.cooperativeManagerId !== userId) {
          throw new ForbiddenException('You can only update listings for your cooperative');
        }
      } else {
        throw new ForbiddenException('Not authorized to update crop listings');
      }

      // If updating available quantity, ensure it doesn't exceed total available
      if (updateData.totalAvailableKg !== undefined) {
        if (updateData.totalAvailableKg < listing.availableKg) {
          throw new BadRequestException(
            `New total available (${updateData.totalAvailableKg}) cannot be less than currently available (${listing.availableKg})`
          );
        }
      }

      return await this.databaseService.cropListing.update({
        where: { id: listingId },
        data: updateData,
        include: {
          cropType: {
            include: { crop: true },
          },
        },
      });
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error updating crop listing: ' + error.message);
    }
  }

  async getCropListings(
    filters?: {
      cropTypeId?: string;
      locationId?: number;
      minPrice?: number;
      maxPrice?: number;
      sellerType?: 'FARMER' | 'COOPERATIVE';
      cooperativeType?: 'COLLECTIVE' | 'NON_COLLECTIVE';
    }
  ) {
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
              cooperativeManager: {
                select: {
                  firstName: true,
                  lastName: true,
                  telephone: true,
                },
              },
            },
          },
        },
        orderBy: { pricePerKg: 'asc' },
      });
    } catch (error) {
      throw new BadRequestException('Error fetching crop listings: ' + error.message);
    }
  }

  // ---------------- ORDERS ----------------

  async createOrder(
    createOrderDto: CreateOrderDto,
    buyerId: string,
    userRole: string
  ) {
    try {
      // Only buyers can create orders
      if (userRole !== Role_Enum.BUYER) {
        throw new ForbiddenException('Only buyers can create orders');
      }

      // Validate seller exists and get type
      let sellerType: OrderType;
      let sellerName: string;

      if (createOrderDto.orderType === OrderType.FARMER) {
        const farmer = await this.databaseService.farmer.findUnique({
          where: { id: createOrderDto.sellerId },
          include: { user: true, cooperative: true },
        });
        
        if (!farmer) {
          throw new NotFoundException('Farmer not found');
        }
        
        sellerName = `${farmer.user.firstName} ${farmer.user.lastName}`;
        
        // If farmer is in a non-collective cooperative, seller becomes the cooperative
        if (farmer.cooperative && farmer.cooperative.collectiveType === 'NON_COLLECTIVE') {
          throw new BadRequestException(
            'Farmers in non-collective cooperatives must be ordered through their cooperative'
          );
        }
      } else if (createOrderDto.orderType === OrderType.COLLECTIVE_COOPERATIVE || 
                 createOrderDto.orderType === OrderType.NON_COLLECTIVE_COOPERATIVE) {
        const cooperative = await this.databaseService.cooperative.findUnique({
          where: { id: createOrderDto.sellerId },
        });
        
        if (!cooperative) {
          throw new NotFoundException('Cooperative not found');
        }
        
        sellerName = cooperative.name;
        
        // Validate cooperative type matches order type
        if ((cooperative.collectiveType === 'COLLECTIVE' && 
             createOrderDto.orderType !== OrderType.COLLECTIVE_COOPERATIVE) ||
            (cooperative.collectiveType === 'NON_COLLECTIVE' && 
             createOrderDto.orderType !== OrderType.NON_COLLECTIVE_COOPERATIVE)) {
          throw new BadRequestException('Cooperative type does not match order type');
        }
      } else {
        throw new BadRequestException('Invalid order type');
      }

      return await this.databaseService.$transaction(async (prisma) => {
        const orderItems = [];
        let totalAmount = 0;

        // Process each order item
        for (const itemDto of createOrderDto.items) {
          const cropListing = await prisma.cropListing.findUnique({
            where: { id: itemDto.cropListingId },
            include: {
              cropType: {
                include: { crop: true },
              },
              farmer: {
                include: { user: true },
              },
              cooperative: true,
            },
          });

          if (!cropListing) {
            throw new NotFoundException(`Crop listing ${itemDto.cropListingId} not found`);
          }

          // Validate listing is active
          if (!cropListing.isActive) {
            throw new BadRequestException(`Crop listing ${cropListing.id} is not active`);
          }

          // Validate quantity
          if (itemDto.quantityKg < cropListing.minimumOrderKg) {
            throw new BadRequestException(
              `Minimum order quantity for ${cropListing.cropType.crop.name} is ${cropListing.minimumOrderKg}kg`
            );
          }

          if (itemDto.quantityKg > cropListing.availableKg) {
            throw new BadRequestException(
              `Insufficient quantity available for ${cropListing.cropType.crop.name}. ` +
              `Available: ${cropListing.availableKg}kg, Requested: ${itemDto.quantityKg}kg`
            );
          }

          // Validate seller matches order type
          if (createOrderDto.orderType === OrderType.FARMER && !cropListing.farmerId) {
            throw new BadRequestException(
              'Order type is FARMER but crop listing is from a cooperative'
            );
          }

          if ((createOrderDto.orderType === OrderType.COLLECTIVE_COOPERATIVE || 
               createOrderDto.orderType === OrderType.NON_COLLECTIVE_COOPERATIVE) && 
              !cropListing.cooperativeId) {
            throw new BadRequestException(
              'Order type is COOPERATIVE but crop listing is from an individual farmer'
            );
          }

          // Validate seller ID matches
          if (createOrderDto.orderType === OrderType.FARMER && 
              cropListing.farmerId !== createOrderDto.sellerId) {
            throw new BadRequestException(
              'Crop listing does not belong to the specified farmer'
            );
          }

          if ((createOrderDto.orderType === OrderType.COLLECTIVE_COOPERATIVE || 
               createOrderDto.orderType === OrderType.NON_COLLECTIVE_COOPERATIVE) && 
              cropListing.cooperativeId !== createOrderDto.sellerId) {
            throw new BadRequestException(
              'Crop listing does not belong to the specified cooperative'
            );
          }

          // Calculate item total
          const itemTotal = itemDto.quantityKg * cropListing.pricePerKg;
          totalAmount += itemTotal;

          // Prepare order item
          orderItems.push({
            cropListingId: cropListing.id,
            quantityKg: itemDto.quantityKg,
            unitPrice: cropListing.pricePerKg,
            totalPrice: itemTotal,
            cropTypeId: cropListing.cropTypeId,
            cropTypeName: cropListing.cropType.name,
            cropName: cropListing.cropType.crop.name,
            sellerName: cropListing.farmer 
              ? `${cropListing.farmer.user.firstName} ${cropListing.farmer.user.lastName}`
              : cropListing.cooperative.name,
            sellerType: createOrderDto.orderType,
          });

          // Update available quantity
          await prisma.cropListing.update({
            where: { id: cropListing.id },
            data: {
              availableKg: cropListing.availableKg - itemDto.quantityKg,
            },
          });
        }

        // Create order
        const order = await prisma.order.create({
          data: {
            orderNumber: this.generateOrderNumber(),
            buyerId,
            farmerId: createOrderDto.orderType === OrderType.FARMER ? createOrderDto.sellerId : null,
            cooperativeId: createOrderDto.orderType !== OrderType.FARMER ? createOrderDto.sellerId : null,
            orderType: createOrderDto.orderType,
            totalAmount,
            currency: 'RWF',
            status: OrderStatus.PENDING,
            deliveryAddress: createOrderDto.deliveryAddress,
            deliveryDate: createOrderDto.deliveryDate ? new Date(createOrderDto.deliveryDate) : null,
            deliveryNotes: createOrderDto.deliveryNotes,
            orderItems: {
              create: orderItems,
            },
          },
          include: {
            orderItems: true,
            buyer: {
              include: {
                user: {
                  select: {
                    firstName: true,
                    lastName: true,
                    telephone: true,
                    email: true,
                  },
                },
              },
            },
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
            cooperative: true,
          },
        });

        // Create initial status history
        await prisma.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: OrderStatus.PENDING,
            notes: 'Order created',
            changedByUserId: buyerId,
          },
        });

        return order;
      });
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error creating order: ' + error.message);
    }
  }

  async updateOrderStatus(
    orderId: string,
    updateOrderStatusDto: UpdateOrderStatusDto,
    userId: string,
    userRole: string
  ) {
    try {
      const order = await this.databaseService.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                },
              },
            },
          },
          farmer: { 
            include: { 
              user: true 
            } 
          },
          cooperative: { 
            include: { 
              cooperativeManager: true 
            } 
          },
        },
      });
      
      if (!order) {
        throw new NotFoundException('Order not found');
      }

      // Check authorization
      let isAuthorized = false;
      
      if (userRole === Role_Enum.BUYER) {
        // Buyers can only cancel their own orders
        if (order.buyerId === userId && 
            updateOrderStatusDto.status === OrderStatus.CANCELLED &&
            order.status === OrderStatus.PENDING) {
          isAuthorized = true;
        }
      } else if (userRole === Role_Enum.FARMER) {
        // Farmers can update status of their own orders
        if (order.farmer && order.farmer.user.id === userId) {
          isAuthorized = true;
        }
      } else if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
                 userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        // Cooperative managers can update status of their cooperative's orders
        if (order.cooperative && order.cooperative.cooperativeManagerId === userId) {
          isAuthorized = true;
        }
      } else if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
        // UmufashaMyumvire can update any order
        isAuthorized = true;
      }

      if (!isAuthorized) {
        throw new ForbiddenException('Not authorized to update this order');
      }

      // Validate status transition
      const validTransitions = {
        [OrderStatus.PENDING]: [OrderStatus.CONFIRMED, OrderStatus.REJECTED, OrderStatus.CANCELLED],
        [OrderStatus.CONFIRMED]: [OrderStatus.PROCESSING, OrderStatus.CANCELLED],
        [OrderStatus.PROCESSING]: [OrderStatus.SHIPPED, OrderStatus.CANCELLED],
        [OrderStatus.SHIPPED]: [OrderStatus.DELIVERED],
        [OrderStatus.DELIVERED]: [],
        [OrderStatus.CANCELLED]: [],
        [OrderStatus.REJECTED]: [],
      };

      if (!validTransitions[order.status].includes(updateOrderStatusDto.status)) {
        throw new BadRequestException(
          `Invalid status transition from ${order.status} to ${updateOrderStatusDto.status}`
        );
      }

      // If cancelling, restore crop listing quantities
      if (updateOrderStatusDto.status === OrderStatus.CANCELLED) {
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
      }

      // Update order status
      const updatedOrder = await this.databaseService.order.update({
        where: { id: orderId },
        data: { status: updateOrderStatusDto.status },
        include: {
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
        },
      });

      // Create status history record
      await this.databaseService.orderStatusHistory.create({
        data: {
          orderId,
          status: updateOrderStatusDto.status,
          notes: updateOrderStatusDto.notes,
          changedByUserId: userId,
        },
      });

      return updatedOrder;
    } catch (error) {
      if (error instanceof BadRequestException || 
          error instanceof NotFoundException || 
          error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error updating order status: ' + error.message);
    }
  }

  async getOrders(
    userId: string,
    userRole: string,
    filters?: {
      status?: OrderStatus;
      orderType?: OrderType;
      startDate?: Date;
      endDate?: Date;
    }
  ) {
    try {
      const whereClause: any = {};

      // Apply role-based filtering
      if (userRole === Role_Enum.BUYER) {
        whereClause.buyerId = userId;
      } else if (userRole === Role_Enum.FARMER) {
        const farmer = await this.databaseService.farmer.findFirst({
          where: { userId },
          select: { id: true },
        });
        
        if (farmer) {
          whereClause.farmerId = farmer.id;
        } else {
          return []; // Not a farmer, no orders
        }
      } else if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
                 userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        const cooperative = await this.databaseService.cooperative.findFirst({
          where: { cooperativeManagerId: userId },
          select: { id: true },
        });
        
        if (cooperative) {
          whereClause.cooperativeId = cooperative.id;
        } else {
          return []; // Not a cooperative manager, no orders
        }
      }
      // UMUFASHAMYUMVIRE can see all orders (no additional filtering)

      // Apply additional filters
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
          buyer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  telephone: true,
                  email: true,
                },
              },
            },
          },
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
          cooperative: true,
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

  async getOrderById(orderId: string, userId: string, userRole: string) {
    try {
      const order = await this.databaseService.order.findUnique({
        where: { id: orderId },
        include: {
          buyer: {
            include: {
              user: {
                select: {
                  firstName: true,
                  lastName: true,
                  telephone: true,
                  email: true,
                },
              },
            },
          },
          farmer: {
            include: {
              user: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  telephone: true,
                },
              },
            },
          },
          cooperative: true,
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
            include: {
              changedByUser: {
                select: {
                  firstName: true,
                  lastName: true,
                  email: true,
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

      // Check authorization
      let isAuthorized = false;
      
      if (userRole === Role_Enum.BUYER && order.buyerId === userId) {
        isAuthorized = true;
      } else if (userRole === Role_Enum.FARMER && order.farmer?.user.id === userId) {
        isAuthorized = true;
      } else if ((userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
                  userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) && 
                 order.cooperative?.cooperativeManagerId === userId) {
        isAuthorized = true;
      } else if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
        isAuthorized = true;
      }

      if (!isAuthorized) {
        throw new ForbiddenException('Not authorized to view this order');
      }

      return order;
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new BadRequestException('Error fetching order: ' + error.message);
    }
  }
}