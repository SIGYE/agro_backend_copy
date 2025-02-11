import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { PaginationQueryDto } from 'src/pagination/pagination.dto';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { DatabaseService } from 'src/database/database.service';
import { HarvestReportQueryDto } from 'src/pagination/HarvestReportQuery.dto';
import { LocationService } from 'src/location/location.service';
import { ProduceReportQueryDto } from 'src/pagination/ProduceReportQuery.dto';

@Injectable()
export class ReportsService {
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService) { }

  async harvestReport(query: HarvestReportQueryDto, locationId?: number) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy,
        sortOrder = 'desc',
        startDate,
        endDate,
        cropTypeId
      } = query;
      const skip = (page - 1) * limit;

      // Get location IDs if locationId is provided
      const locationIds = locationId
        ? await this.locationService.getAllChildrenLocations(locationId)
        : [];

      const locationQuery = locationId
        ? { locationId: { in: locationIds } }
        : {};

      // Build date range filter
      const dateFilter = {};
      if (startDate || endDate) {
        dateFilter['startDate'] = {
          ...(startDate && { gte: new Date(startDate) }),
          ...(endDate && { lte: new Date(endDate) }),
        };
      }

      // Get raw seasons data with filters
      const rawSeasons = await this.databaseService.season.findMany({
        where: {
          farmer: {
            user: { ...locationQuery },
          },
          ...dateFilter,
          ...(cropTypeId && { cropTypeId }),
        },
        select: {
          cropTypeId: true,
          produceHarvested: true,
          createdAt: true,
          croType: {
            select: {
              id: true,
              name: true,
              cropId: true,
              crop: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Process the data to create hierarchical aggregation
      const cropAggregation = rawSeasons.reduce((acc, season) => {
        const cropId = season.croType.crop.id;
        const cropTypeId = season.cropTypeId;
        const produceHarvested = parseFloat(season.produceHarvested) || 0;

        // Initialize crop if not exists
        if (!acc[cropId]) {
          acc[cropId] = {
            cropId,
            cropName: season.croType.crop.name,
            totalProduce: 0,
            cropTypes: {},
            _count: 0,
            dateRange: {
              earliest: season.createdAt,
              latest: season.createdAt
            }
          };
        }

        // Initialize cropType if not exists
        if (!acc[cropId].cropTypes[cropTypeId]) {
          acc[cropId].cropTypes[cropTypeId] = {
            cropTypeId,
            cropTypeName: season.croType.name,
            totalProduce: 0,
            _count: 0,
            dateRange: {
              earliest: season.createdAt,
              latest: season.createdAt
            }
          };
        }

        // Update counts, totals and date ranges
        acc[cropId].totalProduce += produceHarvested;
        acc[cropId]._count++;
        acc[cropId].dateRange.earliest = new Date(Math.min(
          acc[cropId].dateRange.earliest.getTime(),
          season.createdAt.getTime()
        ));
        acc[cropId].dateRange.latest = new Date(Math.max(
          acc[cropId].dateRange.latest.getTime(),
          season.createdAt.getTime()
        ));

        // Update crop type specific data
        acc[cropId].cropTypes[cropTypeId].totalProduce += produceHarvested;
        acc[cropId].cropTypes[cropTypeId]._count++;
        acc[cropId].cropTypes[cropTypeId].dateRange.earliest = new Date(Math.min(
          acc[cropId].cropTypes[cropTypeId].dateRange.earliest.getTime(),
          season.createdAt.getTime()
        ));
        acc[cropId].cropTypes[cropTypeId].dateRange.latest = new Date(Math.max(
          acc[cropId].cropTypes[cropTypeId].dateRange.latest.getTime(),
          season.createdAt.getTime()
        ));

        return acc;
      }, {});

      // Transform to array and sort
      let sortedData = Object.values(cropAggregation);
      if (sortBy) {
        sortedData.sort((a, b) => {
          let aValue = a[sortBy];
          let bValue = b[sortBy];

          if (sortBy.includes('.')) {
            const [parent, child] = sortBy.split('.');
            aValue = a[parent]?.[child];
            bValue = b[parent]?.[child];
          }

          if (typeof aValue === 'string') {
            return sortOrder === 'desc'
              ? bValue.localeCompare(aValue)
              : aValue.localeCompare(bValue);
          }

          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });
      }

      // Apply pagination
      const total = sortedData.length;
      const lastPage = Math.ceil(total / limit);
      const paginatedData = sortedData.slice(skip, skip + limit);

      // Transform and enrich the data
      const enrichedData = paginatedData.map((crop: any) => {
        const averageProducePerCrop = crop.totalProduce / crop._count;

        const cropTypes = Object.values(crop.cropTypes).map((type: any) => ({
          cropTypeId: type.cropTypeId,
          cropTypeName: type.cropTypeName,
          totalProduce: type.totalProduce,
          averageProducePerType: type.totalProduce / type._count,
          percentageOfTotalProduce: (type.totalProduce / crop.totalProduce) * 100,
          numberOfSeasons: type._count,
          dateRange: {
            earliest: type.dateRange.earliest,
            latest: type.dateRange.latest
          }
        }));

        return {
          cropId: crop.cropId,
          cropName: crop.cropName,
          totalProduce: crop.totalProduce,
          averageProducePerCrop,
          numberOfSeasons: crop._count,
          dateRange: crop.dateRange,
          cropTypes
        };
      });

      return {
        data: enrichedData,
        meta: {
          total,
          page,
          lastPage,
          limit,
          filters: {
            locationId: locationId || null,
            startDate: startDate || null,
            endDate: endDate || null,
            cropTypeId: cropTypeId || null
          }
        }
      };

    } catch (error) {
      console.error('Error in harvestReport:', error);
      throw new Error(`Failed to generate harvest report: ${error.message}`);
    }
  }

  // Helper function to get months array
  getMonthsArray() {
    return [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
  }

  // Produce report service method
  async produceReport(query: ProduceReportQueryDto) {
    try {
      const {
        page = 1,
        limit = 10,
        sortBy,
        sortOrder = 'desc',
        year = new Date().getFullYear(),
        locationId,
        groupByMonth = true
      } = query;
      const skip = (page - 1) * limit;

      // Validate and get location data
      let locationIds = [];
      if (locationId != null && locationId != undefined && locationId >= 0 && !Number.isNaN(locationId)) {
        const location = await this.databaseService.location.findUnique({
          where: { id: locationId }
        });

        if (!location) {
          throw new NotFoundException(`Location with ID ${locationId} not found`);
        }

        locationIds = await this.locationService.getAllChildrenLocations(locationId);
      }

      const locationQuery = locationIds.length > 0 ? { locationId: { in: locationIds } } : {};

      // Get raw produce data
      const records = await this.databaseService.farmerAnimalRegistrationProduce.findMany({
        where: {
          animalFarmerRegistration: {
            animalFarmerRegistration: {
              farmer: {
                user: { ...locationQuery }
              }
            }
          },
          createdAt: {
            gte: new Date(year, 0, 1),
            lte: new Date(year, 11, 31)
          }
        },
        include: {
          animalFarmerRegistration: {
            include: {
              animalFarmerRegistration: {
                include: {
                  farmer: {
                    include: {
                      user: true
                    }
                  }
                }
              }
            }
          }
        }
      });

      // Process and aggregate data
      let processedData;
      if (groupByMonth) {
        // Group by month
        const months = this.getMonthsArray();
        processedData = months.map(month => {
          const monthIndex = months.indexOf(month);
          const monthRecords = records.filter(record =>
            record.createdAt.getMonth() === monthIndex
          );

          const totalProduce = monthRecords.reduce((sum, record) =>
            sum + (record.amount || 0), 0
          );

          const uniqueFarmers = new Set(
            monthRecords.map(record =>
              record.animalFarmerRegistration.animalFarmerRegistration.farmer.id
            )
          );

          return {
            month,
            monthIndex,
            totalProduce,
            numberOfRecords: monthRecords.length,
            numberOfFarmers: uniqueFarmers.size,
            averagePerFarmer: uniqueFarmers.size ? totalProduce / uniqueFarmers.size : 0
          };
        });
      } else {
        // Group by record
        processedData = records.map(record => ({
          id: record.id,
          date: record.createdAt,
          amount: record.amount,
          farmerId: record.animalFarmerRegistration.animalFarmerRegistration.farmer.id,
          farmerName: record.animalFarmerRegistration.animalFarmerRegistration.farmer.user.firstName,
          month: this.getMonthsArray()[record.createdAt.getMonth()],
          monthIndex: record.createdAt.getMonth()
        }));
      }

      // Sort data
      if (sortBy) {
        processedData.sort((a, b) => {
          const aValue = a[sortBy];
          const bValue = b[sortBy];

          if (typeof aValue === 'string') {
            return sortOrder === 'desc'
              ? bValue.localeCompare(aValue)
              : aValue.localeCompare(bValue);
          }

          return sortOrder === 'desc' ? bValue - aValue : aValue - bValue;
        });
      }

      // Calculate totals for metadata
      const totalProduce = records.reduce((sum, record) => sum + (record.amount || 0), 0);
      const uniqueFarmers = new Set(
        records.map(record => record.animalFarmerRegistration.animalFarmerRegistration.farmer.id)
      );

      // Apply pagination
      const total = processedData.length;
      const lastPage = Math.ceil(total / limit);
      const paginatedData = processedData.slice(skip, skip + limit);

      return {
        data: paginatedData,
        meta: {
          total,
          page,
          lastPage,
          limit,
          year,
          locationId: locationId || null,
          summary: {
            totalProduce,
            totalFarmers: uniqueFarmers.size,
            averagePerFarmer: uniqueFarmers.size ? totalProduce / uniqueFarmers.size : 0
          }
        }
      };

    } catch (error) {
      console.error('Error in produceReport:', error);
      throw new Error(`Failed to generate produce report: ${error.message}`);
    }
  }
}
