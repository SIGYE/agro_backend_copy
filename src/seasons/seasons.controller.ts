import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  BadRequestException,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SeasonsService } from './seasons.service';
import { CreateSeasonDto } from './dto/create-season.dto';
import { UpdateSeasonDto } from './dto/update-season.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role_Enum } from '../enums/role.enum';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';

@Controller('seasons')
@UseGuards(AuthGuard, RolesGuard)
@ApiTags('Seasons')
export class SeasonsController {
  constructor(private readonly seasonsService: SeasonsService) {}

  @Post()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiResponse({ status: 201, description: 'Season created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Invalid data or crop not registered' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
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
  @ApiResponse({ status: 200, description: 'List of seasons' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
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
  @ApiResponse({ status: 200, description: 'List of farmer seasons' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
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
  @ApiResponse({ status: 200, description: 'List of cooperative seasons' })
  @ApiResponse({ status: 400, description: 'Bad request - Non-collective cooperatives do not have cooperative-level seasons' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  async findAllByCooperativeId(@Param('cooperativeId') cooperativeId: string, @Request() req) {
    if (!cooperativeId) throw new BadRequestException('cooperativeId is required');
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAllByCooperativeId(cooperativeId, userId, userRole);
  }

  @Get('cooperative/:cooperativeId/all-seasons')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiResponse({ status: 200, description: 'Comprehensive list of cooperative seasons with context' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  async findAllByCooperativeIdComprehensive(
    @Param('cooperativeId') cooperativeId: string, 
    @Request() req
  ) {
    if (!cooperativeId) throw new BadRequestException('cooperativeId is required');
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findAllByCooperativeIdComprehensive(cooperativeId, userId, userRole);
  }

  @Get('crop-type/:cropTypeId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiResponse({ status: 200, description: 'List of seasons for crop type' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
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
  @ApiResponse({ status: 200, description: 'List of seasons' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
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
  @ApiResponse({ status: 200, description: 'List of cooperative seasons for crop type' })
  @ApiResponse({ status: 400, description: 'Bad request - Non-collective cooperatives do not have cooperative-level seasons' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
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
  @ApiResponse({ status: 200, description: 'Season details' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.findOne(id, userId, userRole);
  }

  @Patch(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiResponse({ status: 200, description: 'Season updated successfully' })
  @ApiResponse({ status: 400, description: 'Bad request' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @ApiResponse({ status: 404, description: 'Season not found' })
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
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.FARMER,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiResponse({ status: 200, description: 'Season deleted successfully' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized' })
  @ApiResponse({ status: 404, description: 'Season not found' })
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.seasonsService.remove(id, userId, userRole);
  }
}