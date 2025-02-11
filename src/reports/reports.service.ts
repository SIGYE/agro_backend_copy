import { Injectable } from '@nestjs/common';
import { CreateReportDto } from './dto/create-report.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { PaginationQueryDto } from 'src/pagination/pagination.dto';
import { AnalyticsService } from 'src/analytics/analytics.service';
import { DatabaseService } from 'src/database/database.service';
import { HarvestReportQueryDto } from 'src/pagination/HarvestReportQuery.dto';
import { LocationService } from 'src/location/location.service';

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

  // Example interface for the response type


  findAll() {
    return `This action returns all reports`;
  }

  findOne(id: number) {
    return `This action returns a #${id} report`;
  }

  update(id: number, updateReportDto: UpdateReportDto) {
    return `This action updates a #${id} report`;
  }

  remove(id: number) {
    return `This action removes a #${id} report`;
  }
}
