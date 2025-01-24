import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCropDto } from './dto/create-crop.dto';
import { UpdateCropDto } from './dto/update-crop.dto';
import { DatabaseService } from 'src/database/database.service';
import * as XLSX from 'xlsx';
import { LocationService } from 'src/location/location.service';

@Injectable()
export class CropService {
  constructor(private readonly dataBaseService: DatabaseService, private readonly locationService: LocationService) { }
  async create(createCropDto: CreateCropDto, userId: string) {

    try {
      let crop = await this.dataBaseService.crop.create({
        data: {
          name: createCropDto.name,
          createdBy: userId

        }
      })
      if (createCropDto.cropTypes && createCropDto.cropTypes.length > 0) {
        for (let cropType of createCropDto.cropTypes) {
          await this.dataBaseService.cropType.create({
            data: {
              name: cropType.name,
              cropId: crop.id
            }
          })
        }
      } else {
        await this.dataBaseService.cropType.create({
          data: {
            name: createCropDto.name,
            cropId: crop.id
          }
        })
      }
      return await this.dataBaseService.crop.findUnique({
        where: {
          id: crop.id
        },
        include: {
          cropType: true
        }
      })
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll() {
    try {
      return await this.dataBaseService.crop.findMany();
    }
    catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAllCropFarmerRegistration(locationId: number) {
    try {
      // Check if the location exists
      const location = await this.dataBaseService.location.findUnique({
        where: { id: locationId }
      });

      if (!location) {
        throw new NotFoundException(`Location with ID ${locationId} not found`);
      }
      let locations = await this.locationService.getAllChildrenLocationIds(locationId);
      return await this.dataBaseService.cropFarmerRegistration.findMany({
        where: {
          farmer: {
            user: {
              location: {
                id: {
                  in: locations
                }

              }
            }
          }
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findOne(id: string) {
    try {
      return await this.dataBaseService.crop.findUnique({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async update(id: string, updateCropDto: UpdateCropDto) {
    try {
      return await this.dataBaseService.crop.update({
        where: {
          id: id
        },
        data: {
          name: updateCropDto.name
        }
      });
    }
    catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async remove(id: string) {
    try {
      return await this.dataBaseService.crop.delete({
        where: {
          id: id
        }
      });
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }
  async importCrops(file: Express.Multer.File, userId: string): Promise<{ success: number; failed: number; errors: any[] }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    // Skip the first row (assuming it's the header row)
    const rowsToProcess = data.slice(1);

    let success = 0;
    let failed = 0;
    const errors = [];

    for (const row of rowsToProcess) {
      try {
        // Map the row to a userDto-like object based on the cell index
        let cropDto = {
          name: row[0],
          cropTypes: []

        };


        await this.create(cropDto, userId) // Register vet with the custom object
        success++;
      } catch (error) {
        failed++;
        errors.push({
          row: row,
          error: error.message || 'Unknown error occurred',
        });
      }
    }

    return { success, failed, errors };
  }
}
