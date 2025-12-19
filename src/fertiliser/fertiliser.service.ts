import { Injectable } from '@nestjs/common';
import { CreateFertiliserDto } from './dto/create-fertiliser.dto';
import { UpdateFertiliserDto } from './dto/update-fertiliser.dto';
import { DatabaseService } from 'src/database/database.service';
import { FertiliserDto } from 'src/farmer/dto/fertiliser.dto';

@Injectable()
export class FertiliserService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(userId: string, createFertiliserDto: CreateFertiliserDto) {
    try {
      return await this.databaseService.feterlizer.create({
        data: {
          name: createFertiliserDto.name,
          creator: {
            connect: {
              id: userId
            }
          }
        }
      });

    } catch (e) {
      throw e;
    }
  }

  async findAll() {
    try {
      return await this.databaseService.feterlizer.findMany();
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.feterlizer.findUnique({
        where: {
          id: id
        }
      });
    }
    catch (e) {
      throw e;
    }

  }

  async update(id: string, updateFertiliserDto: UpdateFertiliserDto) {
    try {
      return await this.databaseService.feterlizer.update({
        where: {
          id: id
        },
        data: {
          name: updateFertiliserDto.name
        }
      });
    } catch (e) {
      throw e;
    }
  }
  async assignFertiliserToSeason(fertiliserDto: FertiliserDto) {
    try {
      await this.databaseService.cropFertilizerFarmerRegistration.create({
        data: {
          fertilizerId: fertiliserDto.fertiliserId,
          seasonId: fertiliserDto.seasonId,
          amount: fertiliserDto.amountOfFertilizer,
          measurementId: fertiliserDto.metricId
        }
      })
    } catch (e) {
      throw e
    }
  }
  async remove(id: string) {
    try {
      return await this.databaseService.feterlizer.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
  async getTopFertilizers(limit?: number, locationId?: number) {
    try {
      // Prepare the where clause for filtering
      let whereClause = {};

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause = {
          farmingActivities: {
            some: {
              season: {
                farmer: {
                  locationId: locationId,
                },
              },
            },
          },
        };
      }

      // Get fertilizers with their farming activities
      const fertilizers = await this.databaseService.feterlizer.findMany({
        where: whereClause,
        include: {
          farmingActivities: {
            include: {
              season: {
                include: {
                  farmer: true, // Include farmer to access location data
                  cropType: {
                    include: {
                      crop: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      // Process fertilizers to calculate statistics
      const fertilizerStats = fertilizers.map((fertilizer) => {
        // Calculate total amount used
        const totalAmount = fertilizer.farmingActivities.reduce((sum, activity) => {
          return sum + (activity.amount || 0);
        }, 0);

        // Get unique crops and count them
        const cropMap = new Map();
        fertilizer.farmingActivities.forEach((activity) => {
          const crop = activity.season.cropType.crop;
          if (crop) {
            if (!cropMap.has(crop.id)) {
              cropMap.set(crop.id, {
                id: crop.id,
                name: crop.name,
                count: 0,
              });
            }
            cropMap.get(crop.id).count += 1;
          }
        });

        const cropsUsedOn = Array.from(cropMap.values());
        const totalCrops = cropsUsedOn.length;

        return {
          id: fertilizer.id,
          name: fertilizer.name,
          totalAmount,
          totalCrops,
          cropsUsedOn,
          usageCount: fertilizer.farmingActivities.length,
        };
      });

      // Sort by usage count (or could sort by totalAmount if preferred)
      const sortedFertilizers = fertilizerStats.sort((a, b) => b.usageCount - a.usageCount);

      // Return the top N fertilizers or all if no limit is provided
      return limit ? sortedFertilizers.slice(0, limit) : sortedFertilizers;
    } catch (error) {
      throw error;
    }
  }
}
