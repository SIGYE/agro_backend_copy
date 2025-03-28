import { Injectable } from '@nestjs/common';
import { DatabaseService } from '../database/database.service';

import { Activities } from '@prisma/client';
import { CreateFarmingActivityDto } from './dto/create-farming-activity.dto';

@Injectable()
export class FarmingActivityService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(createFarmingActivityDto: CreateFarmingActivityDto) {
    try {
      // Extract the main farming activity data
      const {
        date,
        activity,
        seasonId,
        medicines,
        vaccines,
        fertilizers,
        metrics,
        amount
      } = createFarmingActivityDto;

      // Create the base farming activity
      const farmingActivity = await this.databaseService.farmingActivity.create({
        data: {
          date: new Date(date),
          activity,
          amount,
          season: {
            connect: {
              id: seasonId
            }
          }
        }
      });

      // Process medicines if provided
      if (medicines && medicines.length > 0) {
        // Create arrays to hold unique disease and pest IDs from medicines
        const medicineRelatedDiseaseIds = medicines
          .filter(medicine => medicine.diseaseId)
          .map(medicine => ({ id: medicine.diseaseId }));

        const medicineRelatedPestIds = medicines
          .filter(medicine => medicine.pestId)
          .map(medicine => ({ id: medicine.pestId }));

        // Update data object for the activity
        const updateData: any = {
          medicines: {
            connect: medicines.map(medicine => ({ id: medicine.id }))
          }
        };

        // Add disease connections if there are any
        if (medicineRelatedDiseaseIds.length > 0) {
          updateData.diseases = {
            connect: medicineRelatedDiseaseIds
          };
        }

        // Add pest connections if there are any
        if (medicineRelatedPestIds.length > 0) {
          updateData.pests = {
            connect: medicineRelatedPestIds
          };
        }

        await this.databaseService.farmingActivity.update({
          where: { id: farmingActivity.id },
          data: updateData
        });
      }

      // We'll handle pest and disease connections from medicines
      // This is already handled in the medicines processing section

      // Process vaccines if provided and the activity is vaccination
      if (vaccines && vaccines.length > 0 && activity === Activities.VACCINATION) {
        await this.databaseService.farmingActivity.update({
          where: { id: farmingActivity.id },
          data: {
            vaccines: {
              connect: vaccines.map(vaccine => ({ id: vaccine.id }))
            }
          }
        });
      }

      // Process fertilizers if provided and the activity is fertilization
      if (fertilizers && fertilizers.length > 0 && activity === Activities.FERTILIZATION) {
        await this.databaseService.farmingActivity.update({
          where: { id: farmingActivity.id },
          data: {
            fertilizers: {
              connect: fertilizers.map(fertilizer => ({ id: fertilizer.id }))
            }
          }
        });
      }

      // Process metrics if provided
      if (metrics && metrics.length > 0) {
        await this.databaseService.farmingActivity.update({
          where: { id: farmingActivity.id },
          data: {
            metrics: {
              connect: metrics.map(metric => ({ id: metric.metricId }))
            }
          }
        });
      }

      // Return the complete farming activity with all relations
      return await this.databaseService.farmingActivity.findUnique({
        where: { id: farmingActivity.id },
        include: {
          season: true,
          medicines: true,
          vaccines: true,
          fertilizers: true,
          metrics: true,
          pests: true,
          diseases: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updateFarmingActivityDto: CreateFarmingActivityDto) {
    try {
      const {
        date,
        activity,
        seasonId,
        medicines,
        vaccines,
        fertilizers,
        metrics,
        amount
      } = updateFarmingActivityDto;

      // Prepare the base update data
      const data: any = {};

      if (date !== undefined) {
        data.date = new Date(date);
      }

      if (activity !== undefined) {
        data.activity = activity;
      }

      if (seasonId !== undefined) {
        data.season = {
          connect: {
            id: seasonId
          }
        };
      }

      if (amount !== undefined) {
        data.amount = amount;
      }

      // Update the base farming activity
      let updatedActivity = await this.databaseService.farmingActivity.update({
        where: { id },
        data,
        include: {
          season: true,
          medicines: true,
          vaccines: true,
          fertilizers: true,
          metrics: true,
          diseases: true,
          pests: true
        }
      });

      // Handle medicines if provided
      if (medicines !== undefined) {
        // First disconnect all existing medicines
        await this.databaseService.farmingActivity.update({
          where: { id },
          data: {
            medicines: {
              set: [] // Disconnect all existing medicines
            }
          }
        });

        // When medicines list is changed, we also need to reset pests and diseases
        await this.databaseService.farmingActivity.update({
          where: { id },
          data: {
            diseases: { set: [] }, // Disconnect all existing diseases
            pests: { set: [] }     // Disconnect all existing pests
          }
        });

        // Then connect the new ones if there are any
        if (medicines.length > 0) {

          // Create arrays to hold unique disease and pest IDs from medicines
          const medicineRelatedDiseaseIds = medicines
            .filter(medicine => medicine.diseaseId)
            .map(medicine => ({ id: medicine.diseaseId }));

          const medicineRelatedPestIds = medicines
            .filter(medicine => medicine.pestId)
            .map(medicine => ({ id: medicine.pestId }));

          // Build the update data
          const updateData: any = {
            medicines: {
              connect: medicines.map(medicine => ({ id: medicine.id }))
            }
          };

          // Add disease connections if there are any
          if (medicineRelatedDiseaseIds.length > 0) {
            updateData.diseases = {
              connect: medicineRelatedDiseaseIds
            };
          }

          // Add pest connections if there are any
          if (medicineRelatedPestIds.length > 0) {
            updateData.pests = {
              connect: medicineRelatedPestIds
            };
          }

          await this.databaseService.farmingActivity.update({
            where: { id },
            data: updateData
          });
        }
      }

      // When medicines are updated, we should also reset and update pests and diseases
      // This is handled in the medicines section

      // Handle vaccines if provided
      if (vaccines !== undefined) {
        // First disconnect all existing vaccines
        await this.databaseService.farmingActivity.update({
          where: { id },
          data: {
            vaccines: {
              set: [] // Disconnect all existing vaccines
            }
          }
        });

        // Then connect the new ones
        if (vaccines.length > 0 && updatedActivity.activity === Activities.VACCINATION) {
          await this.databaseService.farmingActivity.update({
            where: { id },
            data: {
              vaccines: {
                connect: vaccines.map(vaccine => ({ id: vaccine.id }))
              }
            }
          });
        }
      }

      // Handle fertilizers if provided
      if (fertilizers !== undefined) {
        // First disconnect all existing fertilizers
        await this.databaseService.farmingActivity.update({
          where: { id },
          data: {
            fertilizers: {
              set: [] // Disconnect all existing fertilizers
            }
          }
        });

        // Then connect the new ones
        if (fertilizers.length > 0 && updatedActivity.activity === Activities.FERTILIZATION) {
          await this.databaseService.farmingActivity.update({
            where: { id },
            data: {
              fertilizers: {
                connect: fertilizers.map(fertilizer => ({ id: fertilizer.id }))
              }
            }
          });
        }
      }

      // Handle metrics if provided
      if (metrics !== undefined) {
        // First disconnect all existing metrics
        await this.databaseService.farmingActivity.update({
          where: { id },
          data: {
            metrics: {
              set: [] // Disconnect all existing metrics
            }
          }
        });

        // Then connect the new ones
        if (metrics.length > 0) {
          await this.databaseService.farmingActivity.update({
            where: { id },
            data: {
              metrics: {
                connect: metrics.map(metric => ({ id: metric.metricId }))
              }
            }
          });
        }
      }

      // Return the updated farming activity with all relations
      return await this.databaseService.farmingActivity.findUnique({
        where: { id },
        include: {
          season: true,
          medicines: true,
          vaccines: true,
          fertilizers: true,
          metrics: true,
          diseases: true,
          pests: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  // The findAll, findAllBySeason, findOne, and remove methods remain unchanged
  async findAll() {
    try {
      return await this.databaseService.farmingActivity.findMany({
        include: {
          season: true,
          medicines: true,
          vaccines: true,
          fertilizers: true,
          metrics: true,
          diseases: true,
          pests: true
        },
        orderBy: {
          date: 'desc'
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAllBySeason(seasonId: string) {
    try {
      return await this.databaseService.farmingActivity.findMany({
        where: {
          seasonId: seasonId
        },
        include: {
          season: true,
          medicines: true,
          vaccines: true,
          fertilizers: true,
          metrics: true,
          diseases: true,
          pests: true
        },
        orderBy: {
          date: 'desc'
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.farmingActivity.findUnique({
        where: {
          id: id
        },
        include: {
          season: true,
          medicines: true,
          vaccines: true,
          fertilizers: true,
          metrics: true,
          diseases: true,
          pests: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      // First disconnect all relations to prevent foreign key constraint errors
      await this.databaseService.farmingActivity.update({
        where: { id },
        data: {
          medicines: { set: [] },
          vaccines: { set: [] },
          fertilizers: { set: [] },
          metrics: { set: [] },
          diseases: { set: [] },  // Added disconnection for diseases
          pests: { set: [] }      // Added disconnection for pests
        }
      });

      // Then delete the farming activity
      return await this.databaseService.farmingActivity.delete({
        where: { id }
      });
    } catch (e) {
      throw e;
    }
  }
}