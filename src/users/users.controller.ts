import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, ParseUUIDPipe, Req, UnauthorizedException, Query, UseInterceptors, UploadedFile, BadRequestException, Put } from '@nestjs/common';
import { UsersService, UserWithRoles } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AuthGuard } from 'src/guards/auth.guard';
import { ApiBearerAuth, ApiBody, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';
import { Roles } from 'src/decorators/roles.decorator';
import { Role_Enum } from 'src/enums/role.enum';
import { ApiResponse } from 'src/responses/api.response';
import { ChangePasswordDTO } from './dto/change-password.dto';
import { AuthRequest } from 'src/types/auth-request.type';
import { Agronomy, Farmer, Status, User, Veterinary } from '@prisma/client';
import { Allow } from 'src/decorators/allow.decorator';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
@UseGuards(AuthGuard)
@ApiTags('Users')
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) { }

  @Allow()
  @Post()
  async createDevAdmin(@Body() createUserDto: CreateUserDto) {
    const user = await this.usersService.create(createUserDto)
    return new ApiResponse(true, "Dev Admin Created Successfully", user, null);
  }

  @Get('/all')
  async findAll(): Promise<ApiResponse<User[]>> {
    return new ApiResponse<User[]>(true, "All Users", await this.usersService.findAll(), null);
  }

  @Get('/id/:id')
  @ApiParam({ name: "id", type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<UserWithRoles>> {
    return new ApiResponse<UserWithRoles>(true, "User Retrieved", await this.usersService.findOne(id), null);
  }

  @Put('/update/:id')
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateUserDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto): Promise<ApiResponse<User>> {
    return new ApiResponse<User>(true, "Updated User", await this.usersService.update(id, updateUserDto), null);
  }

  @Delete('/delete/:id')
  @ApiParam({ name: "id", type: String })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<User>> {
    return new ApiResponse<User>(true, "Deleted User", await this.usersService.remove(id), null);
  }


  @Post('change-password')
  @Allow()
  async changePassword(@Req() request: AuthRequest, @Body() changePasswordDTO: ChangePasswordDTO): Promise<ApiResponse<User>> {
    if (!request.user) {
      throw new UnauthorizedException("Please Login")
    } else {
      return new ApiResponse<User>(true, "Password Changed Successfully", await this.usersService.changeLoggedInPassword(request, changePasswordDTO), null);
    }
  }

  @Post('register-agronomist')
  @Roles(Role_Enum.ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerAgronomist(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<Agronomy>> {
    return new ApiResponse<Agronomy>(true, "Agronomist Registered Successfully", await this.usersService.registerAgronomist(createUserDto), null);
  }
  @Post('register-veterinary')
  @Roles(Role_Enum.ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerVeterinary(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<Veterinary>> {
    return new ApiResponse<Veterinary>(true, "Veterinary Registered Successfully", await this.usersService.registerVet(createUserDto), null);
  }
  @Post('register-farmer')
  @Roles(Role_Enum.ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerFarmer(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<Farmer>> {
    return new ApiResponse<Farmer>(true, "Farmer Registered Successfully", await this.usersService.registerFarmer(createUserDto), null);
  }
  @Post('import-farmers')
  @Roles(Role_Enum.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleVets(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.usersService.registerMultipleFarmers(file);
  }
  @Post('import-veterinarians')
  @Roles(Role_Enum.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleFarmers(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.usersService.registerMultipleVets(file);
  }
  @Post('import-agronomists')
  @Roles(Role_Enum.ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleAgronomists(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.usersService.registerMultipleAgronomists(file);
  }


  // changing the user account status
  @Patch('change-account-status/:userId')
  @UseGuards(AuthGuard)
  @ApiQuery({ name: "status", enum: Status })
  @ApiParam({ name: "userId", type: String })
  async changeAccountStatus(@Req() request: AuthRequest, @Param('userId') userId: string, @Query('status') status: Status): Promise<ApiResponse<User>> {
    if (!request.user) {
      throw new UnauthorizedException("Please Login")
    } else {
      return new ApiResponse<User>(true, "Account Status Changed Successfully", await this.usersService.changeUserAccountStatus(userId, status), 200);
    }
  }


}
