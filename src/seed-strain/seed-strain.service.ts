import { Injectable } from '@nestjs/common';
import { CreateSeedStrainDto } from './dto/create-seed-strain.dto';
import { UpdateSeedStrainDto } from './dto/update-seed-strain.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class SeedStrainService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(userId: string, createSeedStrainDto: CreateSeedStrainDto) {
    try {
      return await this.databaseService.seedStrain.create({
        data: {
          name: createSeedStrainDto.name,
          cropType: {
            connect: {
              id: createSeedStrainDto.cropTypeId
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
      return await this.databaseService.seedStrain.findMany({
        include: {
          cropType: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAllByCropType(cropTypeId: string) {
    try {
      return await this.databaseService.seedStrain.findMany({
        where: {
          cropTypeId: cropTypeId
        },
        include: {
          cropType: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.seedStrain.findUnique({
        where: {
          id: id
        },
        include: {
          cropType: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updateSeedStrainDto: UpdateSeedStrainDto) {
    try {
      return await this.databaseService.seedStrain.update({
        where: {
          id: id
        },
        data: {
          name: updateSeedStrainDto.name,
          ...(updateSeedStrainDto.cropTypeId && {
            cropType: {
              connect: {
                id: updateSeedStrainDto.cropTypeId
              }
            }
          })
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.seedStrain.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
  async getTopSeedStrains(limit?: number, locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: any = {};

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.seasons = {
          some: {
            farmer: {
              user: {
                locationId: locationId
              }
            }
          }
        };
      }

      // Get seed strains with their seasons data
      const seedStrains = await this.databaseService.seedStrain.findMany({
        where: whereClause,
        include: {
          cropType: {
            include: {
              crop: true
            }
          },
          seasons: {
            include: {
              farmer: true,
              croType: {
                include: {
                  crop: true
                }
              }
            }
          }
        }
      });

      // Process seed strains to calculate statistics
      const seedStrainStats = seedStrains.map((seedStrain) => {
        // Calculate total plantations area
        const totalPlantationArea = seedStrain.seasons.reduce((sum, season) => {
          return sum + (season.plantationArea || 0);
        }, 0);

        // Calculate total seeds used
        const totalSeedsUsed = seedStrain.seasons.reduce((sum, season) => {
          return sum + (season.seeds || 0);
        }, 0);

        // Calculate total produce harvested
        const totalProduceHarvested = seedStrain.seasons.reduce((sum, season) => {
          return sum + (season.produceHarvested || 0);
        }, 0);

        // Get unique farmers and count them
        const farmerSet = new Set(seedStrain.seasons.map(season => season.farmerId));
        const totalFarmers = farmerSet.size;

        return {
          id: seedStrain.id,
          name: seedStrain.name,
          cropType: seedStrain.cropType.name,
          crop: seedStrain.cropType.crop.name,
          totalSeasons: seedStrain.seasons.length,
          totalPlantationArea,
          totalSeedsUsed,
          totalProduceHarvested,
          totalFarmers,
          seasons: seedStrain.seasons
        };
      });

      // Sort by number of seasons (usage count)
      const sortedSeedStrains = seedStrainStats.sort((a, b) => b.totalSeasons - a.totalSeasons);

      // If limit is provided, split results into top strains and "Others"
      if (limit && sortedSeedStrains.length > limit) {
        const topStrains = sortedSeedStrains.slice(0, limit);
        const otherStrains = sortedSeedStrains.slice(limit);

        // Calculate aggregated stats for "Others"
        const othersCategory = {
          id: 'others',
          name: 'Others',
          cropType: 'Various',
          crop: 'Various',
          totalSeasons: otherStrains.reduce((sum, strain) => sum + strain.totalSeasons, 0),
          totalPlantationArea: otherStrains.reduce((sum, strain) => sum + strain.totalPlantationArea, 0),
          totalSeedsUsed: otherStrains.reduce((sum, strain) => sum + strain.totalSeedsUsed, 0),
          totalProduceHarvested: otherStrains.reduce((sum, strain) => sum + strain.totalProduceHarvested, 0),
          totalFarmers: new Set(
            otherStrains.flatMap(strain => strain.seasons?.map(season => season.farmerId) || [])
          ).size
        };

        return [...topStrains, othersCategory];
      }

      return sortedSeedStrains;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get seed strain usage grouped by crop
   * @param locationId Optional location filter
   * @returns Crop-based seed strain usage statistics
   */
  async getSeedStrainUsageByCrop(locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: any = {};

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.farmer = {
          user: {
            locationId: locationId
          }
        };
      }

      // Get all seasons with required relations
      const seasons = await this.databaseService.season.findMany({
        where: whereClause,
        include: {
          croType: {
            include: {
              crop: true
            }
          },
          seedStrain: true
        }
      });

      // Group seasons by crop
      const cropMap = new Map();

      seasons.forEach(season => {
        const cropId = season.croType.crop.id;
        const cropName = season.croType.crop.name;

        if (!cropMap.has(cropId)) {
          cropMap.set(cropId, {
            id: cropId,
            name: cropName,
            totalSeasons: 0,
            totalPlantationArea: 0,
            totalSeedsUsed: 0,
            totalProduceHarvested: 0,
            seedStrains: new Map()
          });
        }

        const cropData = cropMap.get(cropId);
        cropData.totalSeasons += 1;
        cropData.totalPlantationArea += season.plantationArea || 0;
        cropData.totalSeedsUsed += season.seeds || 0;
        cropData.totalProduceHarvested += season.produceHarvested || 0;

        // Track seed strain usage within this crop
        const strainId = season.seedStrain.id;
        if (!cropData.seedStrains.has(strainId)) {
          cropData.seedStrains.set(strainId, {
            id: strainId,
            name: season.seedStrain.name,
            count: 0,
            plantationArea: 0,
            seedsUsed: 0,
            produceHarvested: 0
          });
        }

        const strainData = cropData.seedStrains.get(strainId);
        strainData.count += 1;
        strainData.plantationArea += season.plantationArea || 0;
        strainData.seedsUsed += season.seeds || 0;
        strainData.produceHarvested += season.produceHarvested || 0;
      });

      // Convert to array and format the result
      const result = Array.from(cropMap.values()).map(crop => {
        return {
          id: crop.id,
          name: crop.name,
          totalSeasons: crop.totalSeasons,
          totalPlantationArea: crop.totalPlantationArea,
          totalSeedsUsed: crop.totalSeedsUsed,
          totalProduceHarvested: crop.totalProduceHarvested,
          seedStrains: Array.from(crop.seedStrains.values())
            .sort((a: any, b: any) => b.count - a.count)
        };
      });

      // Sort by total seasons
      return result.sort((a, b) => b.totalSeasons - a.totalSeasons);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed seed strain usage table with crop and crop type information
   * @param locationId Optional location filter
   * @returns Detailed seed strain usage data
   */
  async getSeedStrainTable(locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: any = {};

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.seasons = {
          some: {
            farmer: {
              user: {
                locationId: locationId
              }
            }
          }
        };
      }

      // Get all seed strains with necessary relations
      const seedStrains = await this.databaseService.seedStrain.findMany({
        where: whereClause,
        include: {
          cropType: {
            include: {
              crop: true
            }
          },
          seasons: {
            include: {
              farmer: {
                include: {
                  user: {
                    include: {
                      location: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Format the results as a table
      const tableData = seedStrains.map(strain => {
        // Calculate usage statistics
        const totalSeasons = strain.seasons.length;
        const totalPlantationArea = strain.seasons.reduce((sum, season) => sum + (season.plantationArea || 0), 0);
        const totalSeedsUsed = strain.seasons.reduce((sum, season) => sum + (season.seeds || 0), 0);
        const totalProduceHarvested = strain.seasons.reduce((sum, season) => sum + (season.produceHarvested || 0), 0);

        // Calculate number of unique farmers using this strain
        const farmerSet = new Set(strain.seasons.map(season => season.farmerId));

        // Get location data if needed
        let locationData = null;
        if (locationId) {
          // Find a season with location matching the filter to display location info
          const seasonWithLocation = strain.seasons.find(season =>
            season.farmer.user.locationId === locationId
          );

          if (seasonWithLocation) {
            locationData = {
              id: locationId,
              name: seasonWithLocation.farmer.user.location?.name || 'Unknown'
            };
          }
        }

        return {
          id: strain.id,
          name: strain.name,
          cropType: {
            id: strain.cropType.id,
            name: strain.cropType.name
          },
          crop: {
            id: strain.cropType.crop.id,
            name: strain.cropType.crop.name
          },
          totalSeasons,
          totalFarmers: farmerSet.size,
          totalPlantationArea,
          totalSeedsUsed,
          totalProduceHarvested,
          location: locationData,
          yieldRate: totalProduceHarvested > 0 && totalPlantationArea > 0 ?
            (totalProduceHarvested / totalPlantationArea).toFixed(2) : '0'
        };
      });

      // Sort by total usage (seasons count)
      return tableData.sort((a, b) => b.totalSeasons - a.totalSeasons);
    } catch (error) {
      throw error;
    }
  }
}