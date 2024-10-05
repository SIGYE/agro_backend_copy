import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { CreateCooperativeDto } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { DatabaseService } from '../database/database.service';
import { connect } from 'http2';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';


@Injectable()
export class CooperativeService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(createCooperativeDto: CreateCooperativeDto) {
    try {
      return await this.databaseService.cooperative.create({
        data: {
          name: createCooperativeDto.name,
          registationNumber: createCooperativeDto.registrationNumber,
          telephone: createCooperativeDto.telephone,
          membersNumber: createCooperativeDto.membersNumber,
          Location: {
            connect: {
              id: createCooperativeDto.locationId,
            },
          },
        }
      });
    } catch (error) {
      throw new BadRequestException('Error creating cooperative');
    }
  }

  async findAll() {
    try {
      return await this.databaseService.cooperative.findMany();
    } catch (error) {
      throw new BadRequestException('Error fetching cooperatives');
    }
  }

  async findOne(id: string) {
    try {
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id },
      });
      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${id} not found`);
      }
      return cooperative;
    } catch (error) {
      throw new BadRequestException('Error fetching cooperative');
    }
  }

  async update(id: string, updateCooperativeDto: UpdateCooperativeDto) {
    try {
      return await this.databaseService.cooperative.update({
        where: { id },
        data: updateCooperativeDto,
      });
    } catch (error) {
      throw new BadRequestException('Error updating cooperative');
    }
  }
  async assignFarmersToCooperative(assignFarmersToCooperativeDto: AssignFarmersTOCooperative) {
    const { cooperativeId, farmers } = assignFarmersToCooperativeDto;

    try {
      // Check if the cooperative exists
      const cooperative = await this.databaseService.cooperative.findUnique({
        where: { id: cooperativeId },
      });

      if (!cooperative) {
        throw new NotFoundException(`Cooperative with ID ${cooperativeId} not found`);
      }

      // Assign farmers to the cooperative
      return await this.databaseService.cooperative.update({
        where: { id: cooperativeId },
        data: {
          farmers: {
            connect: farmers.map(id => ({ id })),
          },
        },
      });
    } catch (error) {
      throw new BadRequestException('Error assigning farmers to cooperative');
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.cooperative.delete({
        where: { id },
      });
    } catch (error) {
      throw new BadRequestException('Error deleting cooperative');
    }
  }
}