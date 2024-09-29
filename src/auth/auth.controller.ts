import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { loginDto } from './dto/login.dto';
import { ApiBearerAuth, ApiBody, ApiParam, ApiTags } from '@nestjs/swagger';
import { Allow } from 'src/decorators/allow.decorator';
import { ApiResponse } from 'src/responses/api.response';
import { CreateDevAdminDto } from './dto/createDevAdminDto.dto';
import { CurrentUser } from 'src/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { AuthGuard } from 'src/guards/auth.guard';
import { BadRequestException } from '@nestjs/common';
import { ResetPasswordDTO } from './dto/ResetPasswordDTO.dto';
import { ValidateCodeDTO } from './dto/ValidateCodeDTO.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
    constructor(private readonly authService: AuthService) { }

    @Allow()
    @Post('login')
    async login(@Body() loginDto: loginDto) {
        return new ApiResponse(true, "Logged in Successfully", await this.authService.login(loginDto) , null)
    }

    @Allow()
    @Post('signup/dev-admin')
    async registerDevAdmin(@Body() createDevAdminDto : CreateDevAdminDto) {
        return new ApiResponse(true , "Created Dev Admin Successfully" , await this.authService.createDevAdmin(createDevAdminDto) , null)
    }

    @ApiBearerAuth()
    @UseGuards(AuthGuard)
    @Get('profile')
    async getCurrentUser(@CurrentUser() user : User) {
        return user;
    }

    
    // Initiate Password Reset
  @Allow()
  @Post('password-reset/initiate/:email')
  @ApiParam( {name: 'email' , type : String })
  async initiatePasswordReset(@Param('email') email: string) {
    if (!email) {
      throw new BadRequestException('Email is required');
    }

    await this.authService.initiatePasswordReset(email);
    return { message: 'Password reset initiation successful. Check your email for the reset code.' };
  }

  // Reset Password
  @Allow()
  @Post('password-reset/complete')
  async resetPassword(
      @Body() resetPasswordDto : ResetPasswordDTO
  ) {

    await this.authService.resetPassword(resetPasswordDto.email, resetPasswordDto.code, resetPasswordDto.newPassword);
    return { message: 'Password reset successful. You can now log in with your new password.' };
  }

  // Validate Reset Code
  @Allow()
  @Post('password-reset/validate')
  async validateResetCode(
       @Body() validateCodeDto : ValidateCodeDTO
  ) {

    const isValid = await this.authService.validateCode(validateCodeDto.email, validateCodeDto.code);
    return { isValid };
  }

}
