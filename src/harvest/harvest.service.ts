import { 
  Injectable, 
  NotFoundException, 
  ForbiddenException,
  BadRequestException 
} from '@nestjs/common';
import { CreateHarvestDto } from './dto/create-harvest.dto';
import { UpdateHarvestDto } from './dto/update-harvest.dto';
import { DatabaseService } from 'src/database/database.service';
import { Role_Enum } from 'src/enums/role.enum';

@Injectable()
export class HarvestService {
  constructor(private readonly databaseService: DatabaseService) {}

  async create(createHarvestDto: CreateHarvestDto, userId?: string, userRole?: string) {
    try {
      // Get season details with farmer and cooperative info
      const season = await this.databaseService.season.findUnique({
        where: { id: createHarvestDto.seasonId },
        include: {
          farmer: {
            include: {
              cooperative: {
                include: {
                  cooperativeManager: true
                }
              }
            }
          },
          cooperative: {
            include: {
              cooperativeManager: true
            }
          }
        }
      });

      if (!season) {
        throw new NotFoundException(`Season with ID ${createHarvestDto.seasonId} not found`);
      }

      // Authorization checks
      await this.checkHarvestAuthorization(season, userId, userRole);

      // Create harvest
      const harvest = await this.databaseService.harvest.create({
        data: {
          name: createHarvestDto.name,
          amount: createHarvestDto.amount,
          harvestDate: new Date(createHarvestDto.harvestDate),
          season: {
            connect: {
              id: createHarvestDto.seasonId
            }
          }
        },
        include: {
          season: {
            include: {
              farmer: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  },
                  cooperative: {
                    select: {
                      id: true,
                      name: true,
                      collectiveType: true
                    }
                  }
                }
              },
              cooperative: {
                select: {
                  id: true,
                  name: true,
                  collectiveType: true
                }
              },
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          }
        }
      });

      // Update season's produceHarvested
      await this.databaseService.season.update({
        where: { id: createHarvestDto.seasonId },
        data: {
          produceHarvested: {
            increment: createHarvestDto.amount
          }
        }
      });

      // Determine context
      let context = '';
      if (season.cooperative && season.cooperative.collectiveType === 'COLLECTIVE') {
        context = `Collective harvest recorded for ${season.cooperative.name}. This contributes to the cooperative's total production.`;
      } else if (season.farmer?.cooperative) {
        context = `Individual farmer harvest recorded. This contributes to ${season.farmer.cooperative.name}'s total as an individual contribution.`;
      } else if (season.farmer) {
        context = 'Individual farmer harvest recorded (no cooperative affiliation).';
      }

      return {
        harvest,
        message: context
      };
    } catch (e) {
      if (e instanceof NotFoundException || 
          e instanceof ForbiddenException || 
          e instanceof BadRequestException) {
        throw e;
      }
      throw new BadRequestException('Error creating harvest: ' + e.message);
    }
  }

  private async checkHarvestAuthorization(season: any, userId: string, userRole: string) {
    // UmufashaMyumvire can do anything
    if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
      return;
    }

    // For COLLECTIVE cooperative seasons
    if (season.cooperative) {
      const cooperativeManagerId = season.cooperative.cooperativeManager.id;
      
      if (season.cooperative.collectiveType === 'COLLECTIVE') {
        // Only cooperative manager can record collective harvests
        if (userId !== cooperativeManagerId) {
          throw new ForbiddenException(
            'Only the cooperative manager can record harvests for collective cooperative seasons'
          );
        }
      }
    }

    // For individual farmer seasons
    if (season.farmer) {
      const farmerUserId = season.farmer.userId;
      
      // Farmer can record their own harvest
      if (userId === farmerUserId) {
        return;
      }

      // If farmer is in a cooperative, the cooperative manager can also record
      if (season.farmer.cooperative) {
        const cooperativeManagerId = season.farmer.cooperative.cooperativeManager.id;
        if (userId === cooperativeManagerId) {
          return;
        }
      }

      throw new ForbiddenException('You are not authorized to record this harvest');
    }
  }

  async findAll(userId?: string, userRole?: string) {
    try {
      // UmufashaMyumvire sees all harvests
      if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
        return await this.databaseService.harvest.findMany({
          include: {
            season: {
              include: {
                farmer: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true
                      }
                    },
                    cooperative: {
                      select: {
                        id: true,
                        name: true,
                        collectiveType: true
                      }
                    }
                  }
                },
                cooperative: {
                  select: {
                    id: true,
                    name: true,
                    collectiveType: true
                  }
                },
                cropType: {
                  include: {
                    crop: true
                  }
                }
              }
            }
          },
          orderBy: {
            harvestDate: 'desc'
          }
        });
      }

      // Cooperative managers see their cooperative's harvests
      if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
          userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
        
        const cooperative = await this.databaseService.cooperative.findFirst({
          where: { cooperativeManagerId: userId }
        });

        if (!cooperative) {
          throw new NotFoundException('No cooperative found for this manager');
        }

        return await this.databaseService.harvest.findMany({
          where: {
            season: {
              OR: [
                { cooperativeId: cooperative.id }, // Collective harvests
                { 
                  farmer: { 
                    cooperativeId: cooperative.id // Individual farmer harvests in this cooperative
                  } 
                }
              ]
            }
          },
          include: {
            season: {
              include: {
                farmer: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                },
                cooperative: {
                  select: {
                    name: true,
                    collectiveType: true
                  }
                },
                cropType: {
                  include: {
                    crop: true
                  }
                }
              }
            }
          },
          orderBy: {
            harvestDate: 'desc'
          }
        });
      }

      // Farmers see their own harvests
      if (userRole === Role_Enum.FARMER) {
        const farmer = await this.databaseService.farmer.findFirst({
          where: { userId }
        });

        if (!farmer) {
          throw new NotFoundException('Farmer profile not found');
        }

        return await this.databaseService.harvest.findMany({
          where: {
            season: {
              farmerId: farmer.id
            }
          },
          include: {
            season: {
              include: {
                cooperative: {
                  select: {
                    name: true,
                    collectiveType: true
                  }
                },
                cropType: {
                  include: {
                    crop: true
                  }
                }
              }
            }
          },
          orderBy: {
            harvestDate: 'desc'
          }
        });
      }

      throw new ForbiddenException('Not authorized to view harvests');
    } catch (e) {
      if (e instanceof ForbiddenException || e instanceof NotFoundException) {
        throw e;
      }
      throw new BadRequestException('Error fetching harvests');
    }
  }

  async findAllBySeason(seasonId: string, userId?: string, userRole?: string) {
    try {
      const season = await this.databaseService.season.findUnique({
        where: { id: seasonId },
        include: {
          farmer: {
            include: {
              cooperative: {
                include: {
                  cooperativeManager: true
                }
              }
            }
          },
          cooperative: {
            include: {
              cooperativeManager: true
            }
          }
        }
      });

      if (!season) {
        throw new NotFoundException(`Season with ID ${seasonId} not found`);
      }

      // Check authorization to view this season's harvests
      await this.checkHarvestViewAuthorization(season, userId, userRole);

      return await this.databaseService.harvest.findMany({
        where: {
          seasonId: seasonId
        },
        include: {
          season: {
            include: {
              farmer: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              },
              cooperative: {
                select: {
                  name: true,
                  collectiveType: true
                }
              },
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          }
        },
        orderBy: {
          harvestDate: 'desc'
        }
      });
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException('Error fetching harvests by season');
    }
  }

  private async checkHarvestViewAuthorization(season: any, userId: string, userRole: string) {
    if (userRole === Role_Enum.UMUFASHAMYUMVIRE) {
      return;
    }

    // Cooperative managers can view their cooperative's harvests
    if (userRole === Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER || 
        userRole === Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER) {
      
      if (season.cooperative && season.cooperative.cooperativeManagerId === userId) {
        return;
      }

      if (season.farmer?.cooperative?.cooperativeManagerId === userId) {
        return;
      }

      throw new ForbiddenException('Not authorized to view these harvests');
    }

    // Farmers can view their own harvests
    if (userRole === Role_Enum.FARMER) {
      if (season.farmer && season.farmer.userId === userId) {
        return;
      }
      throw new ForbiddenException('Not authorized to view these harvests');
    }

    throw new ForbiddenException('Not authorized to view harvests');
  }

  async findOne(id: string, userId?: string, userRole?: string) {
    try {
      const harvest = await this.databaseService.harvest.findUnique({
        where: { id },
        include: {
          season: {
            include: {
              farmer: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  },
                  cooperative: {
                    select: {
                      id: true,
                      name: true,
                      collectiveType: true,
                      cooperativeManager: true
                    }
                  }
                }
              },
              cooperative: {
                select: {
                  id: true,
                  name: true,
                  collectiveType: true,
                  cooperativeManager: true
                }
              },
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          }
        }
      });

      if (!harvest) {
        throw new NotFoundException(`Harvest with ID ${id} not found`);
      }

      await this.checkHarvestViewAuthorization(harvest.season, userId, userRole);

      return harvest;
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException('Error fetching harvest');
    }
  }

  async update(id: string, updateHarvestDto: UpdateHarvestDto, userId?: string, userRole?: string) {
    try {
      const existingHarvest = await this.databaseService.harvest.findUnique({
        where: { id },
        include: {
          season: {
            include: {
              farmer: {
                include: {
                  cooperative: {
                    include: {
                      cooperativeManager: true
                    }
                  }
                }
              },
              cooperative: {
                include: {
                  cooperativeManager: true
                }
              }
            }
          }
        }
      });

      if (!existingHarvest) {
        throw new NotFoundException(`Harvest with ID ${id} not found`);
      }

      // Check authorization
      await this.checkHarvestAuthorization(existingHarvest.season, userId, userRole);

      const data: any = {};

      if (updateHarvestDto.name !== undefined) {
        data.name = updateHarvestDto.name;
      }

      if (updateHarvestDto.harvestDate !== undefined) {
        data.harvestDate = new Date(updateHarvestDto.harvestDate);
      }

      if (updateHarvestDto.seasonId !== undefined) {
        data.season = {
          connect: {
            id: updateHarvestDto.seasonId
          }
        };
      }

      // Handle amount update - need to recalculate season's produceHarvested
      if (updateHarvestDto.amount !== undefined) {
        const amountDifference = updateHarvestDto.amount - existingHarvest.amount;
        
        data.amount = updateHarvestDto.amount;

        // Update season's produceHarvested
        await this.databaseService.season.update({
          where: { id: existingHarvest.seasonId },
          data: {
            produceHarvested: {
              increment: amountDifference
            }
          }
        });
      }

      return await this.databaseService.harvest.update({
        where: { id },
        data: data,
        include: {
          season: {
            include: {
              farmer: {
                include: {
                  user: {
                    select: {
                      firstName: true,
                      lastName: true
                    }
                  }
                }
              },
              cooperative: {
                select: {
                  name: true,
                  collectiveType: true
                }
              },
              cropType: {
                include: {
                  crop: true
                }
              }
            }
          }
        }
      });
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException('Error updating harvest');
    }
  }

  async remove(id: string, userId?: string, userRole?: string) {
    try {
      const harvest = await this.databaseService.harvest.findUnique({
        where: { id },
        include: {
          season: {
            include: {
              farmer: {
                include: {
                  cooperative: {
                    include: {
                      cooperativeManager: true
                    }
                  }
                }
              },
              cooperative: {
                include: {
                  cooperativeManager: true
                }
              }
            }
          }
        }
      });

      if (!harvest) {
        throw new NotFoundException(`Harvest with ID ${id} not found`);
      }

      // Check authorization
      await this.checkHarvestAuthorization(harvest.season, userId, userRole);

      // Subtract harvest amount from season's produceHarvested before deleting
      await this.databaseService.season.update({
        where: { id: harvest.seasonId },
        data: {
          produceHarvested: {
            decrement: harvest.amount
          }
        }
      });

      return await this.databaseService.harvest.delete({
        where: { id }
      });
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException('Error deleting harvest');
    }
  }

  // New method: Get cooperative harvest summary
  async getCooperativeHarvestSummary(cooperativeId: string, userId?: string, userRole?: string) {
    try {
      // Check if user has access to this cooperative
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id: cooperativeId },
        include: {
          cooperativeManager: true
        }
      });

      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
      }

      if (userRole !== Role_Enum.UMUFASHAMYUMVIRE) {
        if (cooperative.cooperativeManagerId !== userId) {
          throw new ForbiddenException('Not authorized to view this cooperative harvest summary');
        }
      }

      if (cooperative.collectiveType === 'COLLECTIVE') {
        // For COLLECTIVE: Get all harvests from cooperative seasons
        const harvests = await this.databaseService.harvest.findMany({
          where: {
            season: {
              cooperativeId: cooperativeId
            }
          },
          include: {
            season: {
              include: {
                cropType: {
                  include: {
                    crop: true
                  }
                }
              }
            }
          }
        });

        // Group by crop
        const summary = this.groupHarvestsByCrop(harvests);

        return {
          cooperativeName: cooperative.name,
          collectiveType: 'COLLECTIVE',
          message: 'Collective harvests - all farmers contribute to shared production',
          summary
        };
      } else {
        // For NON_COLLECTIVE: Get all harvests from individual farmer seasons
        const harvests = await this.databaseService.harvest.findMany({
          where: {
            season: {
              farmer: {
                cooperativeId: cooperativeId
              }
            }
          },
          include: {
            season: {
              include: {
                farmer: {
                  include: {
                    user: {
                      select: {
                        firstName: true,
                        lastName: true
                      }
                    }
                  }
                },
                cropType: {
                  include: {
                    crop: true
                  }
                }
              }
            }
          }
        });

        // Group by crop and farmer
        const summary = this.groupHarvestsByCropAndFarmer(harvests);

        return {
          cooperativeName: cooperative.name,
          collectiveType: 'NON_COLLECTIVE',
          message: 'Individual farmer harvests - each farmer\'s contribution is tracked separately',
          summary
        };
      }
    } catch (e) {
      if (e instanceof NotFoundException || e instanceof ForbiddenException) {
        throw e;
      }
      throw new BadRequestException('Error fetching cooperative harvest summary');
    }
  }

  private groupHarvestsByCrop(harvests: any[]) {
    const cropMap = new Map();

    harvests.forEach(harvest => {
      const cropName = harvest.season.cropType.crop.name;
      const cropTypeName = harvest.season.cropType.name;
      const key = `${cropName}-${cropTypeName}`;

      if (!cropMap.has(key)) {
        cropMap.set(key, {
          cropName,
          cropTypeName,
          totalHarvested: 0,
          harvestCount: 0,
          harvests: []
        });
      }

      const cropData = cropMap.get(key);
      cropData.totalHarvested += harvest.amount;
      cropData.harvestCount += 1;
      cropData.harvests.push({
        harvestId: harvest.id,
        harvestName: harvest.name,
        amount: harvest.amount,
        harvestDate: harvest.harvestDate
      });
    });

    return Array.from(cropMap.values());
  }

  private groupHarvestsByCropAndFarmer(harvests: any[]) {
    const cropMap = new Map();

    harvests.forEach(harvest => {
      const cropName = harvest.season.cropType.crop.name;
      const cropTypeName = harvest.season.cropType.name;
      const key = `${cropName}-${cropTypeName}`;

      if (!cropMap.has(key)) {
        cropMap.set(key, {
          cropName,
          cropTypeName,
          totalHarvested: 0,
          farmerContributions: []
        });
      }

      const cropData = cropMap.get(key);
      cropData.totalHarvested += harvest.amount;

      // Find or create farmer contribution
      let farmerContrib = cropData.farmerContributions.find(
        f => f.farmerId === harvest.season.farmer.id
      );

      if (!farmerContrib) {
        farmerContrib = {
          farmerId: harvest.season.farmer.id,
          farmerName: `${harvest.season.farmer.user.firstName} ${harvest.season.farmer.user.lastName}`,
          totalHarvested: 0,
          harvests: []
        };
        cropData.farmerContributions.push(farmerContrib);
      }

      farmerContrib.totalHarvested += harvest.amount;
      farmerContrib.harvests.push({
        harvestId: harvest.id,
        harvestName: harvest.name,
        amount: harvest.amount,
        harvestDate: harvest.harvestDate
      });
    });

    return Array.from(cropMap.values());
  }
}