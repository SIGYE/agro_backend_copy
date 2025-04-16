import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreatePestDto } from './dto/create-pest.dto';
import { UpdatePestDto } from './dto/update-pest.dto';
import { DatabaseService } from 'src/database/database.service';
import { PestType } from '@prisma/client';
import { AssignPestDto } from './dto/assign-pest.dto';


@Injectable()
export class PestsService {
  constructor(private readonly databaseService: DatabaseService) { }
  async create(createPestsDto: CreatePestDto, userId: string) {
    try {
      return await this.databaseService.pest.create({
        data: {
          name: createPestsDto.name,
          medication: createPestsDto.medication,
          type: createPestsDto.pestType,
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
  async assignPests(assignPestsDto: AssignPestDto) {
    try {
      const pest = await this.databaseService.pest.findUnique({
        where: { id: assignPestsDto.pestId },
      });

      if (!pest) {
        throw new NotFoundException('Pests not found');
      }

      // Handle crop pest assignments
      if (assignPestsDto.crops && assignPestsDto.crops.length > 0 && pest.type == PestType.CROP) {
        // Verify all crop registrations exist
        const cropRegistrations = await this.databaseService.cropFarmerRegistration.findMany({
          where: {
            id: {
              in: assignPestsDto.crops
            }
          }
        });

        if (cropRegistrations.length !== assignPestsDto.crops.length) {
          throw new BadRequestException('Some crop registrations were not found');
        }

        // Update each crop registration individually to handle the relation
        await Promise.all(
          assignPestsDto.crops.map(cropRegId =>
            this.databaseService.season.update({
              where: { id: cropRegId },
              data: {
                pests: {
                  connect: {
                    id: pest.id
                  }
                }
              }
            })
          )
        );
      }

      // Handle animal pest assignments
      if (assignPestsDto.animals && assignPestsDto.animals.length > 0 && pest.type == PestType.LIVESTOCK) {
        // Verify all animal registrations exist
        const animalRegistrations = await this.databaseService.animalFarmerRegistration.findMany({
          where: {
            id: {
              in: assignPestsDto.animals
            }
          }
        });

        if (animalRegistrations.length !== assignPestsDto.animals.length) {
          throw new BadRequestException('Some animal registrations were not found');
        }

        // Update each animal registration individually to handle the relation
        await Promise.all(
          assignPestsDto.animals.map(animalRegId =>
            this.databaseService.liveStockRegistration.update({
              where: { id: animalRegId },
              data: {
                pests: {
                  connect: {
                    id: pest.id
                  }
                }
              }
            })
          )
        );
      }

      return {
        success: true,
        message: 'Pests assigned successfully',
        affectedCrops: assignPestsDto.crops?.length || 0,
        affectedAnimals: assignPestsDto.animals?.length || 0
      };

    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new Error('Failed to assign pest: ' + error.message);
    }
  }

  async findAll() {
    try {
      return await this.databaseService.pest.findMany();
    } catch (e) {
      throw e;
    }
  }
  async findAllByType(type: PestType) {
    try {
      return await this.databaseService.pest.findMany({
        where: {
          type: type
        }

      })
    } catch (e) {
      throw e
    }
  }
  async findAllByTypeAndUserId(type: PestType, userId: string) {
    try {
      return await this.databaseService.pest.findMany({
        where: {
          type: type,
          createdBy: userId
        }
      })
    } catch (e) {
      throw e
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.pest.findUnique({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updatePestsDto: UpdatePestDto) {
    try {
      return await this.databaseService.pest.update({
        where: {
          id: id
        },
        data: {
          name: updatePestsDto.name
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.pest.delete({
        where: {
          id: id
        }
      });
    }
    catch (e) {
      throw e;
    }
  }
  async getTopPestsAffectingCrops(limit?: number, locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: Record<string, any> = {
        type: 'CROP' // Ensure we only get pests affecting crops
      };

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.farmingActivities = {
          some: {
            season: {
              farmer: {
                user: {
                  locationId: locationId
                }
              }
            }
          }
        };
      }

      // Get pests with their affected crops and farming activities
      const pests = await this.databaseService.pest.findMany({
        where: whereClause,
        include: {
          crops: {
            include: {
              cropType: true
            }
          },
          farmingActivities: {
            include: {
              season: {
                include: {
                  croType: {
                    include: {
                      crop: true
                    }
                  },
                  farmer: {
                    include: {
                      user: true
                    }
                  }
                }
              },
              medicines: true
            }
          }
        }
      });

      // Process pests to calculate statistics
      const pestStats = pests.map((pest) => {
        // Get unique affected crops
        const cropSet = new Set(pest.crops.map(crop => crop.id));

        // Get additional crops from farming activities
        pest.farmingActivities.forEach(activity => {
          const cropId = activity.season.croType.crop.id;
          cropSet.add(cropId);
        });

        const uniqueCrops = Array.from(cropSet).length;

        // Get unique farmers affected
        const farmerSet = new Set(
          pest.farmingActivities.map(activity => activity.season.farmer.id)
        );
        const uniqueFarmers = farmerSet.size;

        // Get unique medicines used
        const medicineSet = new Set(
          pest.farmingActivities.flatMap(activity =>
            activity.medicines.map(medicine => medicine.id)
          )
        );
        const uniqueMedicines = medicineSet.size;

        // Calculate total affected area
        const totalAffectedArea = pest.farmingActivities.reduce((sum, activity) => {
          return sum + (activity.season.plantationArea || 0);
        }, 0);

        // Get top 5 most affected crops
        const cropOccurrences = new Map<string, { id: string, name: string, count: number }>();
        pest.farmingActivities.forEach(activity => {
          const cropId = activity.season.croType.crop.id;
          const cropName = activity.season.croType.crop.name;

          if (!cropOccurrences.has(cropId)) {
            cropOccurrences.set(cropId, { id: cropId, name: cropName, count: 0 });
          }

          cropOccurrences.get(cropId).count += 1;
        });

        const topAffectedCrops = Array.from(cropOccurrences.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          id: pest.id,
          name: pest.name,
          uniqueCropsAffected: uniqueCrops,
          uniqueFarmersAffected: uniqueFarmers,
          uniqueMedicinesUsed: uniqueMedicines,
          occurrenceCount: pest.farmingActivities.length,
          totalAffectedArea,
          topAffectedCrops,
          medication: pest.medication
        };
      });

      // Sort by occurrence count
      const sortedPests = pestStats.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

      // Return with limit if provided
      return limit ? sortedPests.slice(0, limit) : sortedPests;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get top diseases that affect crops with optional location filter
   * @param limit Optional number to limit results
   * @param locationId Optional location filter
   * @returns Array of diseases with affected crop statistics
   */
  async getTopDiseasesAffectingCrops(limit?: number, locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: Record<string, any> = {
        type: 'CROP' // Ensure we only get diseases affecting crops
      };

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.farmingActivities = {
          some: {
            season: {
              farmer: {
                user: {
                  locationId: locationId
                }
              }
            }
          }
        };
      }

      // Get diseases with their affected crops and farming activities
      const diseases = await this.databaseService.disease.findMany({
        where: whereClause,
        include: {
          crops: {
            include: {
              cropType: true
            }
          },
          farmingActivities: {
            include: {
              season: {
                include: {
                  croType: {
                    include: {
                      crop: true
                    }
                  },
                  farmer: {
                    include: {
                      user: true
                    }
                  }
                }
              },
              medicines: true
            }
          }
        }
      });

      // Process diseases to calculate statistics
      const diseaseStats = diseases.map((disease) => {
        // Get unique affected crops
        const cropSet = new Set(disease.crops.map(crop => crop.id));

        // Get additional crops from farming activities
        disease.farmingActivities.forEach(activity => {
          const cropId = activity.season.croType.crop.id;
          cropSet.add(cropId);
        });

        const uniqueCrops = Array.from(cropSet).length;

        // Get unique farmers affected
        const farmerSet = new Set(
          disease.farmingActivities.map(activity => activity.season.farmer.id)
        );
        const uniqueFarmers = farmerSet.size;

        // Get unique medicines used
        const medicineSet = new Set(
          disease.farmingActivities.flatMap(activity =>
            activity.medicines.map(medicine => medicine.id)
          )
        );
        const uniqueMedicines = medicineSet.size;

        // Calculate total affected area
        const totalAffectedArea = disease.farmingActivities.reduce((sum, activity) => {
          return sum + (activity.season.plantationArea || 0);
        }, 0);

        // Get top 5 most affected crops
        const cropOccurrences = new Map<string, { id: string, name: string, count: number }>();
        disease.farmingActivities.forEach(activity => {
          const cropId = activity.season.croType.crop.id;
          const cropName = activity.season.croType.crop.name;

          if (!cropOccurrences.has(cropId)) {
            cropOccurrences.set(cropId, { id: cropId, name: cropName, count: 0 });
          }

          cropOccurrences.get(cropId).count += 1;
        });

        const topAffectedCrops = Array.from(cropOccurrences.values())
          .sort((a, b) => b.count - a.count)
          .slice(0, 5);

        return {
          id: disease.id,
          name: disease.name,
          uniqueCropsAffected: uniqueCrops,
          uniqueFarmersAffected: uniqueFarmers,
          uniqueMedicinesUsed: uniqueMedicines,
          occurrenceCount: disease.farmingActivities.length,
          totalAffectedArea,
          topAffectedCrops,
          medication: disease.medication
        };
      });

      // Sort by occurrence count
      const sortedDiseases = diseaseStats.sort((a, b) => b.occurrenceCount - a.occurrenceCount);

      // Return with limit if provided
      return limit ? sortedDiseases.slice(0, limit) : sortedDiseases;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get pest and medicine relationships
   * @param locationId Optional location filter
   * @returns Pest-medicine relationship data
   */
  async getPestMedicineRelations(locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: Record<string, any> = {
        type: 'CROP' // Ensure we only get pests affecting crops
      };

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.farmingActivities = {
          some: {
            season: {
              farmer: {
                user: {
                  locationId: locationId
                }
              }
            }
          }
        };
      }

      // Get pests with their farming activities and medicines
      const pests = await this.databaseService.pest.findMany({
        where: whereClause,
        include: {
          farmingActivities: {
            include: {
              medicines: true
            }
          }
        }
      });

      // Create pest-medicine relationship data
      const pestMedicineRelations = pests.map(pest => {
        // Count medicine usage
        const medicineUsage = new Map<string, { id: string, name: string, count: number }>();

        pest.farmingActivities.forEach(activity => {
          activity.medicines.forEach(medicine => {
            if (!medicineUsage.has(medicine.id)) {
              medicineUsage.set(medicine.id, {
                id: medicine.id,
                name: medicine.name,
                count: 0
              });
            }

            medicineUsage.get(medicine.id).count += 1;
          });
        });

        // Sort medicines by usage count
        const topMedicines = Array.from(medicineUsage.values())
          .sort((a, b) => b.count - a.count);

        // Calculate effectiveness metrics
        const totalOccurrences = pest.farmingActivities.length;

        return {
          id: pest.id,
          name: pest.name,
          recommendedMedication: pest.medication,
          totalOccurrences,
          medicines: topMedicines,
          effectivenessRatio: topMedicines.length > 0 ?
            (topMedicines[0]?.count / Math.max(1, totalOccurrences)).toFixed(2) : '0'
        };
      });

      // Sort by total occurrences
      return pestMedicineRelations.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get disease and medicine relationships
   * @param locationId Optional location filter
   * @returns Disease-medicine relationship data
   */
  async getDiseaseMedicineRelations(locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: Record<string, any> = {
        type: 'CROP' // Ensure we only get diseases affecting crops
      };

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.farmingActivities = {
          some: {
            season: {
              farmer: {
                user: {
                  locationId: locationId
                }
              }
            }
          }
        };
      }

      // Get diseases with their farming activities and medicines
      const diseases = await this.databaseService.disease.findMany({
        where: whereClause,
        include: {
          farmingActivities: {
            include: {
              medicines: true
            }
          }
        }
      });

      // Create disease-medicine relationship data
      const diseaseMedicineRelations = diseases.map(disease => {
        // Count medicine usage
        const medicineUsage = new Map<string, { id: string, name: string, count: number }>();

        disease.farmingActivities.forEach(activity => {
          activity.medicines.forEach(medicine => {
            if (!medicineUsage.has(medicine.id)) {
              medicineUsage.set(medicine.id, {
                id: medicine.id,
                name: medicine.name,
                count: 0
              });
            }

            medicineUsage.get(medicine.id).count += 1;
          });
        });

        // Sort medicines by usage count
        const topMedicines = Array.from(medicineUsage.values())
          .sort((a, b) => b.count - a.count);

        // Calculate effectiveness metrics
        const totalOccurrences = disease.farmingActivities.length;

        return {
          id: disease.id,
          name: disease.name,
          recommendedMedication: disease.medication,
          totalOccurrences,
          medicines: topMedicines,
          effectivenessRatio: topMedicines.length > 0 ?
            (topMedicines[0]?.count / Math.max(1, totalOccurrences)).toFixed(2) : '0'
        };
      });

      // Sort by total occurrences
      return diseaseMedicineRelations.sort((a, b) => b.totalOccurrences - a.totalOccurrences);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed table of pests with affected crops and medicine usage
   * @param locationId Optional location filter
   * @returns Detailed pest table data
   */
  async getPestTable(locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: Record<string, any> = {
        type: 'CROP' // Ensure we only get pests affecting crops
      };

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.farmingActivities = {
          some: {
            season: {
              farmer: {
                user: {
                  locationId: locationId
                }
              }
            }
          }
        };
      }

      // Get pests with comprehensive relations
      const pests = await this.databaseService.pest.findMany({
        where: whereClause,
        include: {
          crops: {
            include: {
              cropType: true
            }
          },
          farmingActivities: {
            include: {
              season: {
                include: {
                  croType: {
                    include: {
                      crop: true
                    }
                  }
                }
              },
              medicines: true
            }
          },
          creator: true
        }
      });

      // Process into detailed table format
      const tableData = pests.map(pest => {
        // Analyze affected crops
        const cropStats = new Map<string, {
          id: string,
          name: string,
          count: number,
          affectedArea: number
        }>();

        pest.farmingActivities.forEach(activity => {
          const cropId = activity.season.croType.crop.id;
          const cropName = activity.season.croType.crop.name;

          if (!cropStats.has(cropId)) {
            cropStats.set(cropId, {
              id: cropId,
              name: cropName,
              count: 0,
              affectedArea: 0
            });
          }

          const crop = cropStats.get(cropId);
          crop.count += 1;
          crop.affectedArea += activity.season.plantationArea || 0;
        });

        // Analyze medicine usage
        const medicineStats = new Map<string, {
          id: string,
          name: string,
          count: number
        }>();

        pest.farmingActivities.forEach(activity => {
          activity.medicines.forEach(medicine => {
            if (!medicineStats.has(medicine.id)) {
              medicineStats.set(medicine.id, {
                id: medicine.id,
                name: medicine.name,
                count: 0
              });
            }

            medicineStats.get(medicine.id).count += 1;
          });
        });

        return {
          id: pest.id,
          name: pest.name,
          recommendedMedication: pest.medication,
          creator: {
            id: pest.creator.id,
            name: `${pest.creator.firstName} ${pest.creator.lastName}`
          },
          occurrenceCount: pest.farmingActivities.length,
          affectedCrops: Array.from(cropStats.values()).sort((a, b) => b.count - a.count),
          medicinesUsed: Array.from(medicineStats.values()).sort((a, b) => b.count - a.count),
          totalMedicineApplications: Array.from(medicineStats.values())
            .reduce((sum, med) => sum + med.count, 0),
          totalAffectedArea: Array.from(cropStats.values())
            .reduce((sum, crop) => sum + crop.affectedArea, 0)
        };
      });

      // Sort by occurrence count
      return tableData.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get detailed table of diseases with affected crops and medicine usage
   * @param locationId Optional location filter
   * @returns Detailed disease table data
   */
  async getDiseaseTable(locationId?: number) {
    try {
      // Prepare the where clause for filtering
      const whereClause: Record<string, any> = {
        type: 'CROP' // Ensure we only get diseases affecting crops
      };

      // Add location filter if locationId is provided
      if (locationId) {
        whereClause.farmingActivities = {
          some: {
            season: {
              farmer: {
                user: {
                  locationId: locationId
                }
              }
            }
          }
        };
      }

      // Get diseases with comprehensive relations
      const diseases = await this.databaseService.disease.findMany({
        where: whereClause,
        include: {
          crops: {
            include: {
              cropType: true
            }
          },
          farmingActivities: {
            include: {
              season: {
                include: {
                  croType: {
                    include: {
                      crop: true
                    }
                  }
                }
              },
              medicines: true
            }
          },
          creator: true
        }
      });

      // Process into detailed table format
      const tableData = diseases.map(disease => {
        // Analyze affected crops
        const cropStats = new Map<string, {
          id: string,
          name: string,
          count: number,
          affectedArea: number
        }>();

        disease.farmingActivities.forEach(activity => {
          const cropId = activity.season.croType.crop.id;
          const cropName = activity.season.croType.crop.name;

          if (!cropStats.has(cropId)) {
            cropStats.set(cropId, {
              id: cropId,
              name: cropName,
              count: 0,
              affectedArea: 0
            });
          }

          const crop = cropStats.get(cropId);
          crop.count += 1;
          crop.affectedArea += activity.season.plantationArea || 0;
        });

        // Analyze medicine usage
        const medicineStats = new Map<string, {
          id: string,
          name: string,
          count: number
        }>();

        disease.farmingActivities.forEach(activity => {
          activity.medicines.forEach(medicine => {
            if (!medicineStats.has(medicine.id)) {
              medicineStats.set(medicine.id, {
                id: medicine.id,
                name: medicine.name,
                count: 0
              });
            }

            medicineStats.get(medicine.id).count += 1;
          });
        });

        return {
          id: disease.id,
          name: disease.name,
          recommendedMedication: disease.medication,
          creator: {
            id: disease.creator.id,
            name: `${disease.creator.firstName} ${disease.creator.lastName}`
          },
          occurrenceCount: disease.farmingActivities.length,
          affectedCrops: Array.from(cropStats.values()).sort((a, b) => b.count - a.count),
          medicinesUsed: Array.from(medicineStats.values()).sort((a, b) => b.count - a.count),
          totalMedicineApplications: Array.from(medicineStats.values())
            .reduce((sum, med) => sum + med.count, 0),
          totalAffectedArea: Array.from(cropStats.values())
            .reduce((sum, crop) => sum + crop.affectedArea, 0)
        };
      });

      // Sort by occurrence count
      return tableData.sort((a, b) => b.occurrenceCount - a.occurrenceCount);
    } catch (error) {
      throw error;
    }
  }


}
