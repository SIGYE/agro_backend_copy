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
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
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

  @Post()
  @Roles(Role_Enum.UMUFASHAMYUMVIRE)
  @ApiOperation({ summary: 'Create a cooperative (legacy endpoint - requires crops)' })
  @ApiResponse({ status: 201, description: 'Cooperative created successfully' })
  @ApiResponse({ status: 400, description: 'Bad request - Crops are required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only UmufashaMyumvire can create cooperatives' })
  async create(@Body() dto: CreateCooperativeDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.create(dto, userId, userRole);
  }

  @Post('collective')
  @Roles(Role_Enum.UMUFASHAMYUMVIRE)
  @ApiOperation({ 
    summary: 'Create a collective cooperative',
    description: 'Creates a collective cooperative where all farmers must plant the specified crops. Crops are mandatory and required at registration.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Collective cooperative created successfully. All farmers joining this cooperative will be required to plant these crops.' 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Crops are required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only UmufashaMyumvire can create cooperatives' })
  async createCollective(@Body() dto: CreateCollectiveCooperativeDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    const createDto: CreateCooperativeDto = {
      ...dto,
      collectiveType: CollectiveType.COLLECTIVE,
    };
    return this.cooperativeService.create(createDto, userId, userRole);
  }

  @Post('non-collective')
  @Roles(Role_Enum.UMUFASHAMYUMVIRE)
  @ApiOperation({ 
    summary: 'Create a non-collective cooperative',
    description: 'Creates a non-collective cooperative where farmers individually plant crops and contribute to the cooperative total. Crops must be specified as the cooperative registry.'
  })
  @ApiResponse({ 
    status: 201, 
    description: 'Non-collective cooperative created successfully. Farmers will contribute their individual crop quantities to the cooperative total.' 
  })
  @ApiResponse({ status: 400, description: 'Bad request - Crops are required' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only UmufashaMyumvire can create cooperatives' })
  async createNonCollective(@Body() dto: CreateNonCollectiveCooperativeDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
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
  @ApiResponse({ status: 200, description: 'List of cooperatives' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperatives' })
  async findAll(@Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.findAll(userId, userRole);
  }

  @Get(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperative by ID' })
  @ApiResponse({ status: 200, description: 'Cooperative details' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to view this cooperative' })
  async findOne(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.findOne(id, userId, userRole);
  }

  @Get('location/:locationId')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperatives by location' })
  @ApiResponse({ status: 200, description: 'List of cooperatives in location' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperatives by location' })
  async findAllByLocation(
    @Param('locationId') locationId: number,
    @Query('type') type?: CooperativeType,
    @Request() req?
  ) {
    const userId = req?.user?.id;
    const userRole = req?.user?.role?.name || req?.user?.role;
    
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

  @Get('type/:type')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperatives by type (ITSINDA/COOPERATIVE)' })
  @ApiResponse({ status: 200, description: 'List of cooperatives by type' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperatives by type' })
  async findAllByType(@Param('type') type: CooperativeType, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.findAllBySType(type, userId, userRole);
  }

  @Get(':id/crops')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ 
    summary: 'Get cooperative crops',
    description: 'For COLLECTIVE: Shows mandatory crops all farmers must plant. For NON_COLLECTIVE: Shows cooperative crops registry with list of farmers who planted each crop.'
  })
  @ApiResponse({ status: 200, description: 'List of cooperative crops with farmer details for non-collective' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperative crops' })
  async findAllCooperativeCrops(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.findAllCooperativeCrops(id, userId, userRole);
  }

  @Get(':id/crops-summary')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ 
    summary: 'Get cooperative crops produce and area summary',
    description: 'For COLLECTIVE: Shows totals from all farmers. For NON_COLLECTIVE: Shows individual farmer contributions and aggregated totals.'
  })
  @ApiResponse({ status: 200, description: 'Crops summary with farmer breakdown for non-collective' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to view crops summary' })
  async cropsProduceSummary(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.findAllCooperativeCropsProduceAndArea(id, userId, userRole);
  }

  @Get(':id/animals')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Get cooperative animals' })
  @ApiResponse({ status: 200, description: 'List of cooperative animals' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to view cooperative animals' })
  async findAnimals(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.findAllCooperativeAnimals(id, userId, userRole);
  }

  @Patch(':id')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ summary: 'Update cooperative' })
  @ApiResponse({ status: 200, description: 'Cooperative updated successfully' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to update this cooperative' })
  async update(
    @Param('id') id: string, 
    @Body() dto: UpdateCooperativeDto,
    @Request() req
  ) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.update(id, dto, userId, userRole);
  }

  @Post('assign-farmers')
  @HttpCode(HttpStatus.OK)
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ 
    summary: 'Assign existing farmers to cooperative',
    description: 'For COLLECTIVE: Farmers automatically receive all mandatory crops. For NON_COLLECTIVE: Farmers can add their own crops which contribute to the cooperative total.'
  })
  @ApiResponse({ status: 200, description: 'Farmers assigned successfully with crop details' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to assign farmers' })
  async assignFarmers(@Body() dto: AssignFarmersTOCooperative, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.assignFarmersToCooperative(dto, userId, userRole);
  }

  @Post('assign-create-farmers')
  @Roles(
    Role_Enum.UMUFASHAMYUMVIRE, 
    Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, 
    Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER
  )
  @ApiOperation({ 
    summary: 'Create and assign farmers to cooperative',
    description: 'For COLLECTIVE: New farmers automatically receive all mandatory crops. For NON_COLLECTIVE: Farmers can add their own crops which contribute to the cooperative total.'
  })
  @ApiResponse({ status: 201, description: 'Farmers created and assigned successfully with crop details' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to create and assign farmers' })
  async createAndAssignFarmers(@Body() dto: CreateCooperativeFarmerDto, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.assignCreateFarmerToCooperative(dto, userId, userRole);
  }

  @Post(':id/add-crop/:cropTypeId')
  @Roles(Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER)
  @ApiOperation({ 
    summary: 'Add crop to cooperative',
    description: 'For COLLECTIVE: Crop is added as mandatory for all existing farmers. For NON_COLLECTIVE: Crop is added to the registry, farmers can choose to plant it.'
  })
  @ApiResponse({ status: 200, description: 'Crop added successfully with details on farmer updates' })
  @ApiResponse({ status: 404, description: 'Cooperative or crop type not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to add crops' })
  async addCrop(
    @Param('id') cooperativeId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Request() req
  ) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.addCropToCooperative(cooperativeId, cropTypeId, userId, userRole);
  }

  @Delete(':id/remove-crop/:cropTypeId')
  @HttpCode(HttpStatus.OK)
  @Roles(Role_Enum.UMUFASHAMYUMVIRE, Role_Enum.COLLECTIVE_COOPERATIVE_MANAGER, Role_Enum.NON_COLLECTIVE_COOPERATIVE_MANAGER)
  @ApiOperation({ 
    summary: 'Remove crop from cooperative',
    description: 'For COLLECTIVE: Always removes from all farmers (mandatory). For NON_COLLECTIVE: Removes from registry; use cascade=true to also remove from farmers.'
  })
  @ApiResponse({ status: 200, description: 'Crop removed successfully with details on farmer updates' })
  @ApiResponse({ status: 404, description: 'Cooperative or crop not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Not authorized to remove crops' })
  async removeCrop(
    @Param('id') cooperativeId: string,
    @Param('cropTypeId') cropTypeId: string,
    @Query('cascade') cascade?: string,
    @Request() req?
  ) {
    const userId = req?.user?.id;
    const userRole = req?.user?.role?.name || req?.user?.role;
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
  @ApiResponse({ status: 204, description: 'Cooperative deleted successfully' })
  @ApiResponse({ status: 404, description: 'Cooperative not found' })
  @ApiResponse({ status: 403, description: 'Forbidden - Only UmufashaMyumvire can delete cooperatives' })
  async remove(@Param('id') id: string, @Request() req) {
    const userId = req.user.id;
    const userRole = req.user.role?.name || req.user.role;
    return this.cooperativeService.remove(id, userId, userRole);
  }
}