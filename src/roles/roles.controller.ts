import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Put, ParseUUIDPipe, NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { CreateRoleDto } from './dto/create-role.dto';
import { UpdateRoleDto } from './dto/update-role.dto';
import { ApiBearerAuth, ApiParam, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from 'src/guards/auth.guard';
import { AssignRoleDto } from './dto/assign-role.dto';
import { ApiResponse } from 'src/responses/api.response';
import { FindOneParam } from 'src/pipes/param-validation.pipe';

@UseGuards(AuthGuard)
@ApiTags('Roles')
@ApiBearerAuth()
@Controller('roles')
export class RolesController {
  constructor(private readonly rolesService: RolesService) { }

  @Post()
  async create(@Body() createRoleDto: CreateRoleDto) {
    return new ApiResponse(true, "Role Created", await this.rolesService.create(createRoleDto) , null);
  }

  @Get()
  async findAll() {
    return new ApiResponse(true, "All Roles", await this.rolesService.findAll() , null);
  }

  @Get(':id')
  @ApiParam({ name: "id", type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string) {
    return new ApiResponse(true, "Role Retrieved", await this.rolesService.findOne(id) , null);
  }

  @Patch(':id')
  @ApiParam({ name: "id", type: String })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateRoleDto: UpdateRoleDto) {
    return new ApiResponse(true, "Updated Role", await this.rolesService.update(id, updateRoleDto) , null);
  }
  @Put('assign-roles')
  async assignRoles(@Body() assignRoleDto: AssignRoleDto) {
    try {
      await this.rolesService.assignRoles(assignRoleDto)
      return new ApiResponse(true, "Assigned Roles", [] , null)
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw new NotFoundException(error.message);
      }
      throw error
    }
  }

  @Delete(':id')
  @ApiParam({ name: "id", type: String })
  async remove(@Param('id', ParseUUIDPipe) id: string) {
    return new ApiResponse(true, "Role Deleted", await this.rolesService.remove(id) , null);
  }
}
