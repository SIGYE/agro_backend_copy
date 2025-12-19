import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UsePipes,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse as SwaggerApiResponse } from '@nestjs/swagger';
import { ApiResponse } from 'src/responses/api.response';
import { CooperativeService } from './cooperative.service';
import { CreateCooperativeDto, CollectiveType } from './dto/create-cooperative.dto';
import { UpdateCooperativeDto } from './dto/update-cooperative.dto';
import { AssignFarmersTOCooperative } from './dto/assign-farmers-to-cooperative';
import { CreateCooperativeFarmerDto } from './dto/create-farmer-cooperative';
import { CooperativeType } from '@prisma/client';
import { CreateCollectiveCooperativeDto } from './dto/create-collective-cooperative.dto';
import { CreateNonCollectiveCooperativeDto } from './dto/create-non-collective-cooperative.dto';
import { AuthGuard } from '../guards/auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { Roles } from '../decorators/roles.decorator';
import { Role_Enum } from '../enums/role.enum';

@ApiTags('cooperative')
@Controller('cooperative')
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
@UseGuards(AuthGuard, RolesGuard)
export class CooperativeController {
  constructor(private readonly cooperativeService: CooperativeService) {}

  // Backward-compatible endpoint for older mobile clients
  // Returns crop produce/area summary for a cooperative (collective/non-collective)
  @Get('cooperative-crop-data/:id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE,
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER,
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperative crop data (legacy mobile path)' })
  async cooperativeCropData(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    const data = await this.cooperativeService.findAllCooperativeCropsProduceAndArea(id, userId, userRole);
    return { success: true, message: 'Cooperative Crop Data', data, status: 200 };
  }

  @Post()
  @Roles(Role_Enum.UMUFASHAMYUMVIRE)
  @ApiOperation({ summary: 'Create a cooperative (legacy endpoint)' })
  @SwaggerApiResponse({ status: 201, description: 'Cooperative created successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Only UmufashaMyumvire can create cooperatives' })
  async create(@Body() dto: CreateCooperativeDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.create(dto, userId, userRole);
  }

  @Post('collective')
  @Roles(Role_Enum.UMUFASHAMYUMVIRE)
  @ApiOperation({ summary: 'Create a collective cooperative' })
  @SwaggerApiResponse({ status: 201, description: 'Collective cooperative created successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Only UmufashaMyumvire can create cooperatives' })
  async createCollective(@Body() dto: CreateCollectiveCooperativeDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    const createDto: CreateCooperativeDto = {
      ...dto,
      collectiveType: CollectiveType.COLLECTIVE,
    };
    return this.cooperativeService.create(createDto, userId, userRole);
  }

  @Post('non-collective')
  @Roles(Role_Enum.UMUFASHAMYUMVIRE)
  @ApiOperation({ summary: 'Create a non-collective cooperative' })
  @SwaggerApiResponse({ status: 201, description: 'Non-collective cooperative created successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Bad request' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Only UmufashaMyumvire can create cooperatives' })
  async createNonCollective(@Body() dto: CreateNonCollectiveCooperativeDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    const createDto: CreateCooperativeDto = {
      ...dto,
      collectiveType: CollectiveType.NON_COLLECTIVE,
    };
    return this.cooperativeService.create(createDto, userId, userRole);
  }

  @Get()
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get all cooperatives' })
  @SwaggerApiResponse({ status: 200, description: 'List of cooperatives' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperatives' })
  async findAll(@Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.findAll(userId, userRole);
  }

  @Get(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperative by ID' })
  @SwaggerApiResponse({ status: 200, description: 'Cooperative details' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to view this cooperative' })
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.findOne(id, userId, userRole);
  }

  @Get('location/:locationId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperatives by location' })
  @SwaggerApiResponse({ status: 200, description: 'List of cooperatives in location' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperatives by location' })
  async findAllByLocation(
    @Param('locationId') locationId: number,
    @Query('type') type?: CooperativeType,
    @Request() req?
  ) {
    const userId = req?.user?.id;
    const userRole = req?.user?.effectiveRole ?? req?.user?.role?.name ?? req?.user?.role;
    
    if (type) {
      return this.cooperativeService.findAllCooperativesByLocationAndType(
        Number(locationId),
        type,
        userId,
        userRole
      );
    }
    return this.cooperativeService.findAllCooperativesByLocation(
      Number(locationId),
      userId,
      userRole
    );
  }

  // Backward-compatible alias for mobile clients expecting /cooperative/by-location/:locationId/type/:type
  @Get('by-location/:locationId/type/:type')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperatives by location and type (alias path)' })
  async findAllByLocationAndTypeAlias(
    @Param('locationId') locationId: number,
    @Param('type') type: CooperativeType,
    @Request() req?
  ) {
    const userId = req?.user?.id;
    const userRole = req?.user?.effectiveRole ?? req?.user?.role?.name ?? req?.user?.role;
    return this.cooperativeService.findAllCooperativesByLocationAndType(
      Number(locationId),
      type,
      userId,
      userRole
    );
  }

  @Get('type/:type')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperatives by type (ITSINDA/COOPERATIVE)' })
  @SwaggerApiResponse({ status: 200, description: 'List of cooperatives by type' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperatives by type' })
  async findAllByType(@Param('type') type: CooperativeType, @Request() req) {
    try {
      const userId = req.user.id;
      const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
      const data = await this.cooperativeService.findAllBySType(type, userId, userRole);
      return new ApiResponse(true, `Cooperatives of type ${type}`, data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Get(':id/crops')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperative crops' })
  @SwaggerApiResponse({ status: 200, description: 'List of cooperative crops' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperative crops' })
  async findAllCooperativeCrops(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.findAllCooperativeCrops(id, userId, userRole);
  }

  @Get(':id/crops-summary')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperative crops produce and area summary' })
  @SwaggerApiResponse({ status: 200, description: 'Crops summary' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to view crops summary' })
  async cropsProduceSummary(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.findAllCooperativeCropsProduceAndArea(id, userId, userRole);
  }

  @Get(':id/animals')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperative animals' })
  @SwaggerApiResponse({ status: 200, description: 'List of cooperative animals' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperative animals' })
  async findAnimals(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.findAllCooperativeAnimals(id, userId, userRole);
  }

  @Patch(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Update cooperative' })
  @SwaggerApiResponse({ status: 200, description: 'Cooperative updated successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to update this cooperative' })
  async update(
    @Param('id') id: string, 
    @Body() dto: UpdateCooperativeDto,
    @Request() req
  ) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.update(id, dto, userId, userRole);
  }

  @Post('assign-farmers')
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Assign existing farmers to cooperative' })
  @SwaggerApiResponse({ status: 200, description: 'Farmers assigned successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to assign farmers' })
  async assignFarmers(@Body() dto: AssignFarmersTOCooperative, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.assignFarmersToCooperative(dto, userId, userRole);
  }

  @Post('assign-create-farmers')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Create and assign farmers to cooperative' })
  @SwaggerApiResponse({ status: 201, description: 'Farmers created and assigned successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to create and assign farmers' })
  async createAndAssignFarmers(@Body() dto: CreateCooperativeFarmerDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.assignCreateFarmerToCooperative(dto, userId, userRole);
  }

  @Post(':id/add-crop/:cropTypeId')
  @Roles(Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER)
  @ApiOperation({ summary: 'Add crop to collective cooperative' })
  @SwaggerApiResponse({ status: 200, description: 'Crop added successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Cannot add crops to non-collective cooperative' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to add crops' })
  async addCrop(
    @Param('id') cooperativeId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Request() req
  ) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.addCropToCooperative(cooperativeId, cropTypeId, userId, userRole);
  }

  @Delete(':id/remove-crop/:cropTypeId')
  @HttpCode(HttpStatus.OK)
  @Roles(Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER)
  @ApiOperation({ summary: 'Remove crop from collective cooperative' })
  @SwaggerApiResponse({ status: 200, description: 'Crop removed successfully' })
  @SwaggerApiResponse({ status: 400, description: 'Cannot remove crops from non-collective cooperative' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative or crop not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Not authorized to remove crops' })
  async removeCrop(
    @Param('id') cooperativeId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Query('cascade') cascade?: string,
    @Request() req?
  ) {
    const userId = req?.user?.id;
    const userRole = req?.user?.effectiveRole ?? req?.user?.role?.name ?? req?.user?.role;
    const cascadeBool = cascade === 'true';
    return this.cooperativeService.removeCropFromCooperative(
      cooperativeId,
      cropTypeId,
      cascadeBool,
      userId,
      userRole
    );
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(Role_Enum.UMUFASHAMYUMVIRE)
  @ApiOperation({ summary: 'Delete cooperative' })
  @SwaggerApiResponse({ status: 204, description: 'Cooperative deleted successfully' })
  @SwaggerApiResponse({ status: 404, description: 'Cooperative not found' })
  @SwaggerApiResponse({ status: 403, description: 'Forbidden - Only UmufashaMyumvire can delete cooperatives' })
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.activeRole ?? req.user.effectiveRole ?? req.user.role?.name ?? req.user.role;
    return this.cooperativeService.remove(id, userId, userRole);
  }
}
