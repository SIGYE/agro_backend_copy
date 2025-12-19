import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role_Enum } from '../enums/role.enum';
import { ApiResponse } from 'src/responses/api.response';

@Controller('seasons')
@UseGuards(AuthGuard, RolesGuard)
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async create(@Body() createSeasonDto: CreateSeasonDto, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.create(createSeasonDto, userId, userRole);
      return new ApiResponse(true, "Season created successfully", data, 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAll(@Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAll(userId, userRole);
      return new ApiResponse(true, "All seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer/:farmerId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAllByFarmerId(@Param('farmerId') farmerId: string, @Request() req) {
    try {
      if (!farmerId) throw new BadRequestException('farmerId is required');
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByFarmerId(farmerId, userId, userRole);
      return new ApiResponse(true, "Farmer seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('cooperative/:cooperativeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAllByCooperativeId(@Param('cooperativeId') cooperativeId: string, @Request() req) {
    try {
      if (!cooperativeId) throw new BadRequestException('cooperativeId is required');
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByCooperativeId(cooperativeId, userId, userRole);
      return new ApiResponse(true, "Cooperative seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('crop-type/:cropTypeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAllByCropTypeId(@Param('cropTypeId') cropTypeId: string, @Request() req) {
    try {
      if (!cropTypeId) throw new BadRequestException('cropTypeId is required');
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByCropTypeId(cropTypeId, userId, userRole);
      return new ApiResponse(true, "Crop type seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('farmer/:farmerId/crop-type/:cropTypeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAllByFarmerIdAndCropTypeId(
    @Param('farmerId') farmerId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByFarmerIdAndCropTypeId(farmerId, cropTypeId, userId, userRole);
      return new ApiResponse(true, "Farmer crop seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get('cooperative/:cooperativeId/crop-type/:cropTypeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAllByCooperativeIdAndCropTypeId(
    @Param('cooperativeId') cooperativeId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findAllByCooperativeIdAndCropTypeId(
        cooperativeId,
        cropTypeId,
        userId,
        userRole
      );
      return new ApiResponse(true, "Cooperative crop seasons", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findOne(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.findOne(id, userId, userRole);
      return new ApiResponse(true, "Season retrieved", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Patch(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async update(
    @Param('id') id: string,
    @Body() updateSeasonDto: UpdateSeasonDto,
    @Request() req
  ) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.update(id, updateSeasonDto, userId, userRole);
      return new ApiResponse(true, "Season updated", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Delete(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async remove(@Param('id') id: string, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.seasonsService.remove(id, userId, userRole);
      return new ApiResponse(true, "Season deleted", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}
