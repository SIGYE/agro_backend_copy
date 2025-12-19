import {
  BadRequestException,
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { DatabaseService } from '../database/database.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import {
  NotificationType,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
} from '@prisma/client';
import { CreateCropListingDto } from './dto/create-crop-listing.dto';
import { UpdateCropListingDto } from './dto/update-crop-listing.dto';
import { Role_Enum } from '../enums/role.enum';
import { NotificationService } from 'src/notification/notification.service';
import { PaymentOutcome, RecordPaymentDto } from './dto/record-payment.dto';

@Injectable()
export class OrderService {
  constructor(
    private readonly databaseService: DatabaseService,
    private readonly notificationService: NotificationService,
  ) {}

  // Helper to generate order number
  private generateOrderNumber(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `ORD-${timestamp}-${random}`;
  }

  private parseNumberEnv(name: string, fallback: number) {
    const raw = process.env[name];
    if (raw === undefined || raw === null || raw === '') return fallback;
    const value = Number(raw);
    return Number.isFinite(value) ? value : fallback;
  }

  private roundMoney(value: number) {
    return Math.round(value * 100) / 100;
  }

  private computePricing(itemsSubtotal: number) {
    const deliveryFee = this.parseNumberEnv('DELIVERY_FEE', 0);
    const platformFeePercent = this.parseNumberEnv('PLATFORM_FEE_PERCENT', 0);
    const taxPercent = this.parseNumberEnv('TAX_PERCENT', 0);

    const platformFee = this.roundMoney(itemsSubtotal * (platformFeePercent / 100));
    const taxBase = itemsSubtotal + deliveryFee + platformFee;
    const taxAmount = this.roundMoney(taxBase * (taxPercent / 100));
    const totalAmount = this.roundMoney(itemsSubtotal + deliveryFee + platformFee + taxAmount);

    return {
      itemsSubtotal: this.roundMoney(itemsSubtotal),
      deliveryFee: this.roundMoney(deliveryFee),
      platformFee,
      taxAmount,
      totalAmount,
      platformFeePercent,
      taxPercent,
    };
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
        // Get farmer for this user (including cooperative info)
        const farmer = await this.databaseService.farmer.findFirst({
          where: { userId },
          include: {
            cooperative: {
              select: { collectiveType: true },
            },
          },
        });
        
        if (!farmer) {
          throw new ForbiddenException('User is not registered as a farmer');
        }
        
        farmerId = farmer.id;

        // Farmers who belong to a NON_COLLECTIVE cooperative should not create
        // their own marketplace listings. The non-collective leader manages
        // listings on behalf of the group.
        if (farmer.cooperative?.collectiveType === 'NON_COLLECTIVE') {
          throw new ForbiddenException(
            'Farmers in a non-collective group cannot create marketplace listings. Ask your group leader to list crops.',
          );
        }
        
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
    updateData: UpdateCropListingDto,
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

      const nextTotal =
        updateData.totalAvailableKg !== undefined
          ? updateData.totalAvailableKg
          : listing.totalAvailableKg;

      if (
        updateData.totalAvailableKg !== undefined &&
        updateData.availableKg === undefined &&
        updateData.totalAvailableKg < listing.availableKg
      ) {
        throw new BadRequestException(
          `New total available (${updateData.totalAvailableKg}) cannot be less than currently available (${listing.availableKg})`,
        );
      }

      if (updateData.availableKg !== undefined && updateData.availableKg > nextTotal) {
        throw new BadRequestException(
          `availableKg (${updateData.availableKg}) cannot be greater than totalAvailableKg (${nextTotal})`,
        );
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

  async getMyCropListings(userId: string, userRole: string) {
    if (userRole === Role_Enum.FARMER) {
      const farmer = await this.databaseService.farmer.findFirst({
        where: { userId },
        select: { id: true },
      });

      if (!farmer) {
        throw new ForbiddenException('User is not registered as a farmer');
      }

      return this.databaseService.cropListing.findMany({
        where: { farmerId: farmer.id },
        include: {
          cropType: { include: { crop: true } },
          location: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    if (
      userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER ||
      userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
    ) {
      const cooperative = await this.databaseService.cooperative.findFirst({
        where: { cooperativeManagerId: userId },
        select: { id: true },
      });

      if (!cooperative) {
        throw new ForbiddenException('User is not a cooperative manager');
      }

      return this.databaseService.cropListing.findMany({
        where: { cooperativeId: cooperative.id },
        include: {
          cropType: { include: { crop: true } },
          location: true,
        },
        orderBy: { updatedAt: 'desc' },
      });
    }

    throw new ForbiddenException('Not authorized to view crop listings');
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
    userId: string,
    userRole: string
  ) {
    try {
      // Only buyers can create orders
      if (userRole !== Role_Enum.BUYER) {
        throw new ForbiddenException('Only buyers can create orders');
      }

      const buyerProfile = await this.databaseService.buyer.findUnique({
        where: { userId },
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
      });

      if (!buyerProfile) {
        throw new ForbiddenException('Buyer profile not found');
      }

      // Validate seller exists and get type
      let sellerName: string;
      let sellerUserId: string;

      if (createOrderDto.orderType === OrderType.FARMER) {
        const farmer = await this.databaseService.farmer.findUnique({
          where: { id: createOrderDto.sellerId },
          include: { user: true, cooperative: true },
        });
        
        if (!farmer) {
          throw new NotFoundException('Farmer not found');
        }
        
        sellerName = `${farmer.user.firstName} ${farmer.user.lastName}`;
        sellerUserId = farmer.userId;
        
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
        sellerUserId = cooperative.cooperativeManagerId;
        
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
        let itemsSubtotal = 0;

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
          itemsSubtotal += itemTotal;

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

        const pricing = this.computePricing(itemsSubtotal);

        // Create order
        const order = await prisma.order.create({
          data: {
            orderNumber: this.generateOrderNumber(),
            buyerId: buyerProfile.id,
            farmerId: createOrderDto.orderType === OrderType.FARMER ? createOrderDto.sellerId : null,
            cooperativeId: createOrderDto.orderType !== OrderType.FARMER ? createOrderDto.sellerId : null,
            orderType: createOrderDto.orderType,
            itemsSubtotal: pricing.itemsSubtotal,
            deliveryFee: pricing.deliveryFee,
            platformFee: pricing.platformFee,
            taxAmount: pricing.taxAmount,
            totalAmount: pricing.totalAmount,
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
            changedByUserId: userId,
          },
        });

        await this.notificationService.create(
          {
            recipientUserId: sellerUserId,
            actorUserId: userId,
            type: NotificationType.ORDER_REQUEST,
            title: 'New purchase request',
            message: `${buyerProfile.user.firstName} ${buyerProfile.user.lastName} placed an order request (${order.orderNumber}).`,
            data: {
              orderId: order.id,
              orderNumber: order.orderNumber,
              orderType: order.orderType,
              status: order.status,
            },
          },
          prisma,
        );

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

      const buyerUserId = order.buyer.user.id;
      const sellerUserId = order.farmer
        ? order.farmer.userId
        : order.cooperative
          ? order.cooperative.cooperativeManagerId
          : null;

      // Check authorization
      let isAuthorized = false;
      
      if (userRole === Role_Enum.BUYER) {
        // Buyers can only cancel their own orders
        if (buyerUserId === userId && 
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

      const nextStatus = updateOrderStatusDto.status;

      const updatedOrder = await this.databaseService.$transaction(async (prisma) => {
        // If cancelling, restore crop listing quantities
        if (nextStatus === OrderStatus.CANCELLED) {
          const orderItems = await prisma.orderItem.findMany({
            where: { orderId },
            include: { cropListing: true },
          });

          for (const item of orderItems) {
            await prisma.cropListing.update({
              where: { id: item.cropListingId },
              data: {
                availableKg: item.cropListing.availableKg + item.quantityKg,
              },
            });
          }
        }

        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: nextStatus },
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

        await prisma.orderStatusHistory.create({
          data: {
            orderId,
            status: nextStatus,
            notes: updateOrderStatusDto.notes,
            changedByUserId: userId,
          },
        });

        const notificationData = {
          orderId: order.id,
          orderNumber: order.orderNumber,
          orderType: order.orderType,
          status: nextStatus,
        };

        if (nextStatus === OrderStatus.CONFIRMED) {
          await this.notificationService.create(
            {
              recipientUserId: buyerUserId,
              actorUserId: userId,
              type: NotificationType.PAYMENT_REQUIRED,
              title: 'Request accepted',
              message: `Your order ${order.orderNumber} was accepted. Please proceed to payment.`,
              data: notificationData,
            },
            prisma,
          );
        } else if (nextStatus === OrderStatus.REJECTED) {
          await this.notificationService.create(
            {
              recipientUserId: buyerUserId,
              actorUserId: userId,
              type: NotificationType.ORDER_REJECTED,
              title: 'Request rejected',
              message: `Your order ${order.orderNumber} was rejected.`,
              data: notificationData,
            },
            prisma,
          );
        } else if (nextStatus === OrderStatus.CANCELLED) {
          const recipientUserId =
            userId === buyerUserId ? sellerUserId : buyerUserId;

          if (recipientUserId) {
            await this.notificationService.create(
              {
                recipientUserId,
                actorUserId: userId,
                type: NotificationType.ORDER_STATUS_CHANGED,
                title: 'Order cancelled',
                message: `Order ${order.orderNumber} was cancelled.`,
                data: notificationData,
              },
              prisma,
            );
          }
        } else {
          await this.notificationService.create(
            {
              recipientUserId: buyerUserId,
              actorUserId: userId,
              type: NotificationType.ORDER_STATUS_CHANGED,
              title: 'Order updated',
              message: `Order ${order.orderNumber} status changed to ${nextStatus}.`,
              data: notificationData,
            },
            prisma,
          );
        }

        return updatedOrder;
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

  async recordPaymentOutcome(
    orderId: string,
    dto: RecordPaymentDto,
    userId: string,
    userRole: string,
  ) {
    try {
      if (userRole !== Role_Enum.BUYER) {
        throw new ForbiddenException('Only buyers can record payment outcomes');
      }

      if (dto.method === PaymentMethod.MOMO && !dto.momoPhoneNumber) {
        throw new BadRequestException('momoPhoneNumber is required for MOMO payments');
      }

      if (dto.method === PaymentMethod.CARD) {
        if (!dto.cardLast4) {
          throw new BadRequestException('cardLast4 is required for CARD payments');
        }
        if (!/^[0-9]{4}$/.test(dto.cardLast4)) {
          throw new BadRequestException('cardLast4 must be exactly 4 digits');
        }
      }

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
          farmer: { select: { userId: true } },
          cooperative: { select: { cooperativeManagerId: true } },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      if (order.buyer.user.id !== userId) {
        throw new ForbiddenException('You can only record payment for your own order');
      }

      if (order.status !== OrderStatus.CONFIRMED) {
        throw new BadRequestException(
          `Payment can only be recorded for confirmed orders. Current status: ${order.status}`,
        );
      }

      const sellerUserId = order.farmer
        ? order.farmer.userId
        : order.cooperative
          ? order.cooperative.cooperativeManagerId
          : null;

      if (!sellerUserId) {
        throw new BadRequestException('Order seller not found');
      }

      const baseData = {
        orderId: order.id,
        orderNumber: order.orderNumber,
        orderType: order.orderType,
      };

      return await this.databaseService.$transaction(async (prisma) => {
        const attemptNumber =
          (await prisma.paymentTransaction.count({ where: { orderId } })) + 1;

        const transactionStatus: PaymentStatus =
          dto.outcome === PaymentOutcome.SUCCESS
            ? PaymentStatus.SUCCESS
            : dto.outcome === PaymentOutcome.FAILED
              ? PaymentStatus.FAILED
              : PaymentStatus.CANCELLED;

        await prisma.paymentTransaction.create({
          data: {
            orderId,
            attemptNumber,
            status: transactionStatus,
            method: dto.method,
            amount: order.totalAmount,
            currency: order.currency,
            momoPhoneNumber:
              dto.method === PaymentMethod.MOMO ? dto.momoPhoneNumber : null,
            cardLast4: dto.method === PaymentMethod.CARD ? dto.cardLast4 : null,
            notes: dto.notes,
            recordedByUserId: userId,
            metadata: {
              pricing: {
                itemsSubtotal: order.itemsSubtotal,
                deliveryFee: order.deliveryFee,
                platformFee: order.platformFee,
                taxAmount: order.taxAmount,
                totalAmount: order.totalAmount,
              },
            },
          },
        });

        if (dto.outcome === PaymentOutcome.SUCCESS) {
          const updated = await prisma.order.update({
            where: { id: orderId },
            data: { status: OrderStatus.PROCESSING },
          });

          await prisma.orderStatusHistory.create({
            data: {
              orderId,
              status: OrderStatus.PROCESSING,
              notes: dto.notes ? `Payment successful: ${dto.notes}` : 'Payment successful',
              changedByUserId: userId,
            },
          });

          const data = {
            ...baseData,
            status: OrderStatus.PROCESSING,
            outcome: dto.outcome,
          };

          await this.notificationService.create(
            {
              recipientUserId: userId,
              actorUserId: userId,
              type: NotificationType.PAYMENT_SUCCESS,
              title: 'Payment successful',
              message: `Payment successful for order ${order.orderNumber}.`,
              data,
            },
            prisma,
          );

          await this.notificationService.create(
            {
              recipientUserId: sellerUserId,
              actorUserId: userId,
              type: NotificationType.PAYMENT_SUCCESS,
              title: 'Payment received',
              message: `Payment received for order ${order.orderNumber}.`,
              data,
            },
            prisma,
          );

          return updated;
        }

        const outcomeText =
          dto.outcome === PaymentOutcome.CANCELLED ? 'cancelled' : 'failed';

        await prisma.orderStatusHistory.create({
          data: {
            orderId,
            status: order.status,
            notes: dto.notes ? `Payment ${outcomeText}: ${dto.notes}` : `Payment ${outcomeText}`,
            changedByUserId: userId,
          },
        });

        const data = {
          ...baseData,
          status: order.status,
          outcome: dto.outcome,
        };

        await this.notificationService.create(
          {
            recipientUserId: userId,
            actorUserId: userId,
            type: NotificationType.PAYMENT_FAILED,
            title: 'Payment not completed',
            message: `Payment ${outcomeText} for order ${order.orderNumber}.`,
            data,
          },
          prisma,
        );

        await this.notificationService.create(
          {
            recipientUserId: sellerUserId,
            actorUserId: userId,
            type: NotificationType.PAYMENT_FAILED,
            title: 'Payment not completed',
            message: `Buyer payment ${outcomeText} for order ${order.orderNumber}.`,
            data,
          },
          prisma,
        );

        return order;
      });
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new BadRequestException('Error recording payment: ' + error.message);
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
        const buyer = await this.databaseService.buyer.findUnique({
          where: { userId },
          select: { id: true },
        });

        if (!buyer) {
          return [];
        }

        whereClause.buyerId = buyer.id;
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
                  id: true,
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
                  id: true,
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
      
      if (userRole === Role_Enum.BUYER && order.buyer.user.id === userId) {
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

  async getSalesSummary(
    userId: string,
    userRole: string,
    filters?: { startDate?: Date; endDate?: Date },
  ) {
    if (
      userRole !== Role_Enum.FARMER &&
      userRole !== Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER &&
      userRole !== Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
    ) {
      throw new ForbiddenException('Not authorized to view sales summary');
    }

    const whereClause: any = {};

    if (userRole === Role_Enum.FARMER) {
      const farmer = await this.databaseService.farmer.findFirst({
        where: { userId },
        select: { id: true },
      });
      if (!farmer) {
        return {
          totalOrders: 0,
          pendingOrders: 0,
          confirmedUnpaidOrders: 0,
          paidOrders: 0,
          totalRevenue: 0,
        };
      }
      whereClause.farmerId = farmer.id;
    } else {
      const cooperative = await this.databaseService.cooperative.findFirst({
        where: { cooperativeManagerId: userId },
        select: { id: true },
      });
      if (!cooperative) {
        return {
          totalOrders: 0,
          pendingOrders: 0,
          confirmedUnpaidOrders: 0,
          paidOrders: 0,
          totalRevenue: 0,
        };
      }
      whereClause.cooperativeId = cooperative.id;
    }

    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
      if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
    }

    const [totalOrders, pendingOrders, confirmedUnpaidOrders, paidAgg] =
      await this.databaseService.$transaction([
        this.databaseService.order.count({ where: whereClause }),
        this.databaseService.order.count({
          where: { ...whereClause, status: OrderStatus.PENDING },
        }),
        this.databaseService.order.count({
          where: { ...whereClause, status: OrderStatus.CONFIRMED },
        }),
        this.databaseService.order.aggregate({
          where: {
            ...whereClause,
            status: { in: [OrderStatus.PROCESSING, OrderStatus.SHIPPED, OrderStatus.DELIVERED] },
          },
          _count: { id: true },
          _sum: { totalAmount: true },
        }),
      ]);

    return {
      totalOrders,
      pendingOrders,
      confirmedUnpaidOrders,
      paidOrders: paidAgg?._count?.id ?? 0,
      totalRevenue: paidAgg?._sum?.totalAmount ?? 0,
    };
  }

  async listTransactions(
    userId: string,
    userRole: string,
    filters?: {
      status?: PaymentStatus;
      method?: PaymentMethod;
      startDate?: Date;
      endDate?: Date;
      search?: string;
      page?: number;
      limit?: number;
    },
  ) {
    if (
      userRole !== Role_Enum.ADMIN &&
      userRole !== Role_Enum.DEV_ADMIN &&
      userRole !== Role_Enum.UMUFASHAMYUMVIRE
    ) {
      throw new ForbiddenException('Not authorized to view transactions');
    }

    const page = Math.max(1, filters?.page ?? 1);
    const limit = Math.min(100, Math.max(1, filters?.limit ?? 20));
    const skip = (page - 1) * limit;

    const whereClause: any = {};
    if (filters?.status) whereClause.status = filters.status;
    if (filters?.method) whereClause.method = filters.method;
    if (filters?.startDate || filters?.endDate) {
      whereClause.createdAt = {};
      if (filters.startDate) whereClause.createdAt.gte = filters.startDate;
      if (filters.endDate) whereClause.createdAt.lte = filters.endDate;
    }

    if (filters?.search) {
      const search = filters.search.trim();
      whereClause.OR = [
        { order: { orderNumber: { contains: search, mode: 'insensitive' } } },
        {
          order: {
            buyer: {
              user: {
                OR: [
                  { firstName: { contains: search, mode: 'insensitive' } },
                  { lastName: { contains: search, mode: 'insensitive' } },
                  { telephone: { contains: search, mode: 'insensitive' } },
                  { email: { contains: search, mode: 'insensitive' } },
                ],
              },
            },
          },
        },
      ];
    }

    const [items, total] = await this.databaseService.$transaction([
      this.databaseService.paymentTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            include: {
              buyer: {
                include: {
                  user: {
                    select: {
                      id: true,
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
              orderItems: true,
            },
          },
          recordedByUser: {
            select: { id: true, firstName: true, lastName: true, email: true },
          },
        },
      }),
      this.databaseService.paymentTransaction.count({ where: whereClause }),
    ]);

    return {
      items,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getInvoice(orderId: string, userId: string, userRole: string) {
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
        cooperative: {
          include: {
            cooperativeManager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                telephone: true,
                email: true,
              },
            },
          },
        },
        orderItems: true,
        paymentTransactions: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const buyerUserId = order.buyer.user.id;
    const sellerUserId = order.farmer
      ? order.farmer.user.id
      : order.cooperative
        ? order.cooperative.cooperativeManagerId
        : null;

    const isAdminLike =
      userRole === Role_Enum.ADMIN ||
      userRole === Role_Enum.DEV_ADMIN ||
      userRole === Role_Enum.UMUFASHAMYUMVIRE;

    const isBuyer = userRole === Role_Enum.BUYER && userId === buyerUserId;
    const isSeller =
      (userRole === Role_Enum.FARMER ||
        userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER ||
        userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) &&
      sellerUserId === userId;

    if (!isAdminLike && !isBuyer && !isSeller) {
      throw new ForbiddenException('Not authorized to view invoice');
    }

    const successfulPayment = order.paymentTransactions.find(
      (t) => t.status === PaymentStatus.SUCCESS,
    );

    if (!successfulPayment) {
      throw new BadRequestException('Invoice is available after a successful payment');
    }

    const seller =
      order.farmer
        ? {
            type: 'FARMER',
            name: `${order.farmer.user.firstName} ${order.farmer.user.lastName}`,
            telephone: order.farmer.user.telephone,
          }
        : order.cooperative
          ? {
              type: order.orderType,
              name: order.cooperative.name,
              telephone: order.cooperative.telephone ?? order.cooperative.cooperativeManager?.telephone,
            }
          : { type: order.orderType, name: 'Unknown', telephone: null };

    return {
      invoiceNumber: `INV-${order.orderNumber}`,
      issuedAt: successfulPayment.createdAt,
      order: {
        id: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        createdAt: order.createdAt,
      },
      buyer: {
        name: `${order.buyer.user.firstName} ${order.buyer.user.lastName}`,
        telephone: order.buyer.user.telephone,
        email: order.buyer.user.email,
      },
      seller,
      items: order.orderItems.map((it) => ({
        cropName: it.cropName,
        cropTypeName: it.cropTypeName,
        quantityKg: it.quantityKg,
        unitPrice: it.unitPrice,
        totalPrice: it.totalPrice,
      })),
      pricing: {
        itemsSubtotal: order.itemsSubtotal,
        deliveryFee: order.deliveryFee,
        platformFee: order.platformFee,
        taxAmount: order.taxAmount,
        totalAmount: order.totalAmount,
        currency: order.currency,
      },
      payment: {
        status: successfulPayment.status,
        method: successfulPayment.method,
        momoPhoneNumber: successfulPayment.momoPhoneNumber,
        cardLast4: successfulPayment.cardLast4,
        amount: successfulPayment.amount,
        currency: successfulPayment.currency,
        paidAt: successfulPayment.createdAt,
      },
      pickup: {
        buyerPickupConfirmedAt: order.buyerPickupConfirmedAt,
        sellerPickupConfirmedAt: order.sellerPickupConfirmedAt,
      },
    };
  }

  async confirmPickup(orderId: string, userId: string, userRole: string) {
    const order = await this.databaseService.order.findUnique({
      where: { id: orderId },
      include: {
        buyer: { select: { userId: true, user: { select: { id: true } } } },
        farmer: { select: { userId: true } },
        cooperative: { select: { cooperativeManagerId: true } },
      },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const buyerUserId = order.buyer.user.id;
    const sellerUserId = order.farmer
      ? order.farmer.userId
      : order.cooperative
        ? order.cooperative.cooperativeManagerId
        : null;

    const isBuyer = userRole === Role_Enum.BUYER && userId === buyerUserId;
    const isSeller =
      (userRole === Role_Enum.FARMER ||
        userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER ||
        userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) &&
      sellerUserId === userId;

    if (!isBuyer && !isSeller) {
      throw new ForbiddenException('Not authorized to confirm pickup');
    }

    if (order.status !== OrderStatus.SHIPPED && order.status !== OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Pickup can only be confirmed when order is SHIPPED (or already DELIVERED). Current status: ${order.status}`,
      );
    }

    const now = new Date();

    return await this.databaseService.$transaction(async (prisma) => {
      const updateData: any = {};
      let actor: 'BUYER' | 'SELLER';

      if (isBuyer) {
        actor = 'BUYER';
        if (!order.buyerPickupConfirmedAt) {
          updateData.buyerPickupConfirmedAt = now;
        }
      } else {
        actor = 'SELLER';
        if (!order.sellerPickupConfirmedAt) {
          updateData.sellerPickupConfirmedAt = now;
        }
      }

      const updated = await prisma.order.update({
        where: { id: orderId },
        data: updateData,
      });

      const otherUserId = actor === 'BUYER' ? sellerUserId : buyerUserId;
      if (otherUserId) {
        await this.notificationService.create(
          {
            recipientUserId: otherUserId,
            actorUserId: userId,
            type: NotificationType.ORDER_STATUS_CHANGED,
            title: 'Pickup confirmation',
            message:
              actor === 'BUYER'
                ? `Buyer confirmed pickup for order ${updated.orderNumber}.`
                : `Seller confirmed pickup for order ${updated.orderNumber}.`,
            data: { orderId: updated.id, orderNumber: updated.orderNumber, status: updated.status },
          },
          prisma,
        );
      }

      const bothConfirmed =
        (updated.buyerPickupConfirmedAt ?? order.buyerPickupConfirmedAt) &&
        (updated.sellerPickupConfirmedAt ?? order.sellerPickupConfirmedAt);

      if (bothConfirmed && updated.status === OrderStatus.SHIPPED) {
        const delivered = await prisma.order.update({
          where: { id: orderId },
          data: { status: OrderStatus.DELIVERED },
        });

        await prisma.orderStatusHistory.create({
          data: {
            orderId,
            status: OrderStatus.DELIVERED,
            notes: 'Pickup confirmed by both parties',
            changedByUserId: userId,
          },
        });

        await Promise.all(
          [buyerUserId, sellerUserId].filter(Boolean).map((recipientUserId) =>
            this.notificationService.create(
              {
                recipientUserId,
                actorUserId: userId,
                type: NotificationType.ORDER_STATUS_CHANGED,
                title: 'Order delivered',
                message: `Order ${delivered.orderNumber} marked as delivered.`,
                data: { orderId: delivered.id, orderNumber: delivered.orderNumber, status: delivered.status },
              },
              prisma,
            ),
          ),
        );

        return delivered;
      }

      return updated;
    });
  }
}
