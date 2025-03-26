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
import { Agronomy, Farmer, Status, Umufashamyumvire, User, Veterinary } from '@prisma/client';
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
    try {
      const user = await this.usersService.create(createUserDto)
      return new ApiResponse(true, "Dev Admin Created Successfully", user, 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }

  @Get('/all')
  async findAll(): Promise<ApiResponse<User[]>> {
    try {
      return new ApiResponse<User[]>(true, "All Users", await this.usersService.findAll(), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }

  @Get('/id/:id')
  @ApiParam({ name: "id", type: String })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<UserWithRoles>> {
    try {
      return new ApiResponse<UserWithRoles>(true, "User Retrieved", await this.usersService.findOne(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }

  @Put('/update/:id')
  @ApiParam({ name: "id", type: String })
  @ApiBody({ type: UpdateUserDto })
  async update(@Param('id', ParseUUIDPipe) id: string, @Body() updateUserDto: UpdateUserDto): Promise<ApiResponse<User>> {
    try {
      return new ApiResponse<User>(true, "Updated User", await this.usersService.update(id, updateUserDto), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }

  @Delete('/delete/:id')
  @ApiParam({ name: "id", type: String })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<ApiResponse<User>> {
    try {
      return new ApiResponse<User>(true, "Deleted User", await this.usersService.remove(id), 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }


  @Post('change-password')
  @Allow()
  async changePassword(@Req() request: AuthRequest, @Body() changePasswordDTO: ChangePasswordDTO): Promise<ApiResponse<User>> {
    try {
      if (!request.user) {
        throw new UnauthorizedException("Please Login")
      } else {
        return new ApiResponse<User>(true, "Password Changed Successfully", await this.usersService.changeLoggedInPassword(request, changePasswordDTO), 200);
      }
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }

  }

  @Post('register-agronomist')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerAgronomist(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<Agronomy>> {
    try {
      return new ApiResponse<Agronomy>(true, "Agronomist Registered Successfully", await this.usersService.registerAgronomist(createUserDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Post('register-veterinary')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerVeterinary(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<Veterinary>> {
    try {
      return new ApiResponse<Veterinary>(true, "Veterinary Registered Successfully", await this.usersService.registerVet(createUserDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }

  }
  @Post('register-farmer')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerFarmer(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<Farmer>> {
    try {
      return new ApiResponse<Farmer>(true, "Farmer Registered Successfully", await this.usersService.registerFarmer(createUserDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Post('import-farmers')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleVets(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      return this.usersService.registerMultipleFarmers(file);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Post('import-farmers/:cooperativeId')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleFarmersInCooperative(@UploadedFile() file: Express.Multer.File, @Param('cooperativeId') cooperativeId: string) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      return this.usersService.registerMultipleFarmersIntoCooperative(file, cooperativeId);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Post('import-veterinarians')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleFarmers(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      return this.usersService.registerMultipleVets(file);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Post('import-agronomists')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleAgronomists(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      return this.usersService.registerMultipleAgronomists(file);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Post('register-umufasha-myumvire')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @ApiBody({ type: CreateUserDto })
  async registerUmufashaMyumvire(@Body() createUserDto: CreateUserDto): Promise<ApiResponse<Umufashamyumvire>> {
    try {
      return new ApiResponse<Umufashamyumvire>(true, "Umufasha Myumvire Registered Successfully", await this.usersService.registerUmufashaMyumvire(createUserDto), 201);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }
  @Post('import-abafasha-myumvire')
  @Roles(Role_Enum.ADMIN, Role_Enum.DEV_ADMIN)
  @UseInterceptors(FileInterceptor('file'))
  async registerMultipleUmufashaMyumvire(@UploadedFile() file: Express.Multer.File) {
    try {
      if (!file) {
        throw new BadRequestException('No file uploaded');
      }

      return this.usersService.registerMultipleBafashaMyumvire(file);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }



  // changing the user account status
  @Patch('change-account-status/:userId')
  @UseGuards(AuthGuard)
  @ApiQuery({ name: "status", enum: Status })
  @ApiParam({ name: "userId", type: String })
  async changeAccountStatus(@Req() request: AuthRequest, @Param('userId') userId: string, @Query('status') status: Status): Promise<ApiResponse<User>> {
    try {
      if (!request.user) {
        throw new UnauthorizedException("Please Login")
      } else {
        return new ApiResponse<User>(true, "Account Status Changed Successfully", await this.usersService.changeUserAccountStatus(userId, status), 200);
      }
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400)
    }
  }


}
