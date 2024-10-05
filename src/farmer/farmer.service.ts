import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateFarmerDto } from './dto/create-farmer.dto';
import { UpdateFarmerDto } from './dto/update-farmer.dto';
import { DatabaseService } from 'src/database/database.service';
import { LocationService } from 'src/location/location.service';
import { Farmer } from '@prisma/client';
import { UsersService } from 'src/users/users.service';
import { AssignCropToFarmerDto } from './dto/assign-crop-to-farmerDto';
import * as XLSX from 'xlsx';

@Injectable()
export class FarmerService {
  constructor(private readonly databaseService: DatabaseService, private readonly locationService: LocationService, private readonly userServcice: UsersService) { }
  async registerFarmer(CreateFarmerDto: CreateFarmerDto): Promise<Farmer> {
    try {
      let role = await this.databaseService.role.findFirst({
        where: {
          name: "FARMER"
        }
      })
      let user = await this.userServcice.create({ roleId: role.id, ...CreateFarmerDto });

      let farmer = await this.databaseService.farmer.create({
        data: {
          user: {
            connect: {
              id: user.id
            }
          }

        }

      })
      for (let cropId of CreateFarmerDto.cropsId) {
        await this.databaseService.cropFarmerRegistration.create({
          data: {
            plantationArea: CreateFarmerDto.plantationArea,
            seeds: CreateFarmerDto.seeds,
            produceHarvested: CreateFarmerDto.produceHarvested,
            farmer: {
              connect: {
                id: farmer.id
              }
            },
            crop: {
              connect: {
                id: cropId
              }
            }
          }
        })
      }
      return farmer;

    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }
  async assignCropsToFarmers(assignCropsToFarmers: AssignCropToFarmerDto) {
    try {
      let farmer = await this.databaseService.farmer.findUnique({
        where: {
          id: assignCropsToFarmers.farmerId
        }
      })
      for (let cropId of assignCropsToFarmers.cropsId) {
        await this.databaseService.cropFarmerRegistration.create({
          data: {
            plantationArea: assignCropsToFarmers.plantationArea,
            seeds: assignCropsToFarmers.seeds,
            produceHarvested: assignCropsToFarmers.produceHarvested,
            farmer: {
              connect: {
                id: farmer.id
              }
            },
            crop: {
              connect: {
                id: cropId
              }
            }
          }
        })
      }
      return farmer;

    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async findAll() {
    try {
      return await this.databaseService.farmer.findMany({
        include:{
          cropFarmerRegistrations:true
        }
      });
    } catch (e) {
      throw new BadRequestException(e.message)
    }

  }

  async findOne(id: string) {
    try {
       return await this.databaseService.farmer.findUnique({
        where: {
          id: id
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  // update(id: string, updateFarmerDto: UpdateFarmerDto) {
  //   try {
  //     return this.databaseService.farmer.update({
  //       where: {
  //         id: id
  //       },
  //       data: updateFarmerDto
  //     })
  //   }
  // }

  async remove(id: string) {
    try {
      return await this.databaseService.farmer.delete({
        where: {
          id: id
        }
      })
    } catch (e) {
      throw new BadRequestException(e.message)
    }
  }

  async registerMultipleFarmers(file: Express.Multer.File): Promise<{ success: number; failed: number; errors: any[] }> {
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
        let userDto = {
          firstName: row[0],
          lastName: row[1],
          nationalId: row[2],
          telephone: row[3],
          email: row[4],
          locationId: 0,


        };
        let location = await this.locationService.getLocationByName(row[9]);
        userDto.locationId = location.id;
        let role = await this.databaseService.role.findFirst({
          where: {
            name: "FARMER"
          }
        })

        // await this.registerFarmer({ roleId: role.id, ...userDto }); // Register vet with the custom object
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
