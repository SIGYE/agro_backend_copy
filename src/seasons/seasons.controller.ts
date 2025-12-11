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

@Controller('seasons')
@UseGuards(AuthGuard, RolesGuard)
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER
  )
  async create(@Body() createSeasonDto: CreateSeasonDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.create(createSeasonDto, userId, userRole);
  }

  @Get()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAll(@Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAll(userId, userRole);
  }

  @Get('farmer/:farmerId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAllByFarmerId(@Param('farmerId') farmerId: string, @Request() req) {
    if (!farmerId) throw new BadRequestException('farmerId is required');
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAllByFarmerId(farmerId, userId, userRole);
  }

  @Get('cooperative/:cooperativeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAllByCooperativeId(@Param('cooperativeId') cooperativeId: string, @Request() req) {
    if (!cooperativeId) throw new BadRequestException('cooperativeId is required');
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAllByCooperativeId(cooperativeId, userId, userRole);
  }

  @Get('crop-type/:cropTypeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findAllByCropTypeId(@Param('cropTypeId') cropTypeId: string, @Request() req) {
    if (!cropTypeId) throw new BadRequestException('cropTypeId is required');
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAllByCropTypeId(cropTypeId, userId, userRole);
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
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAllByFarmerIdAndCropTypeId(farmerId, cropTypeId, userId, userRole);
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
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAllByCooperativeIdAndCropTypeId(
      cooperativeId,
      cropTypeId,
      userId,
      userRole
    );
  }

  @Get(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findOne(id, userId, userRole);
  }

  @Patch(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER
  )
  async update(
    @Param('id') id: string,
    @Body() updateSeasonDto: UpdateSeasonDto,
    @Request() req
  ) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.update(id, updateSeasonDto, userId, userRole);
  }

  @Delete(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER
  )
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.remove(id, userId, userRole);
  }
}