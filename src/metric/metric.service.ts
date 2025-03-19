import { Injectable } from '@nestjs/common';
import { CreateMetricDto } from './dto/create-metric.dto';
import { UpdateMetricDto } from './dto/update-metric.dto';
import { DatabaseService } from 'src/database/database.service';

@Injectable()
export class MetricService {
  constructor(private readonly databaseService: DatabaseService) { }

  async create(createMetricDto: CreateMetricDto) {
    try {
      return await this.databaseService.metric.create({
        data: {
          name: createMetricDto.name,
          unit: createMetricDto.unit
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findAll() {
    try {
      return await this.databaseService.metric.findMany({
        include: {
          seasons: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: string) {
    try {
      return await this.databaseService.metric.findUnique({
        where: {
          id: id
        },
        include: {
          seasons: true
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async update(id: string, updateMetricDto: UpdateMetricDto) {
    try {
      return await this.databaseService.metric.update({
        where: {
          id: id
        },
        data: {
          ...(updateMetricDto.name && { name: updateMetricDto.name }),
          ...(updateMetricDto.unit && { unit: updateMetricDto.unit })
        }
      });
    } catch (e) {
      throw e;
    }
  }

  async remove(id: string) {
    try {
      return await this.databaseService.metric.delete({
        where: {
          id: id
        }
      });
    } catch (e) {
      throw e;
    }
  }
}