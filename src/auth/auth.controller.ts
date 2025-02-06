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
import { OtpLoginDto } from './dto/otp-login.dto';
import { LoginPayload } from 'src/categories/dto/login-payload.dto';

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
  constructor(private readonly authService: AuthService) { }

  // credential login
  @Allow()
  @Post('login/creds')
  async login(@Body() loginDto: loginDto): Promise<ApiResponse<LoginPayload>> {
    try {
      const data = await this.authService.login(loginDto);
      return new ApiResponse<LoginPayload>(true, "Logged in Successfully", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  // otp login
  @Allow()
  @Post('login/otp')
  async loginWithOtp(@Body() otpLogin: OtpLoginDto): Promise<ApiResponse<LoginPayload>> {
    try {
      const data = await this.authService.loginWithOtp(otpLogin);
      return new ApiResponse<LoginPayload>(true, "Logged in Successfully", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Allow()
  @Post('/login/send-otp/:telephone')
  async sendOtp(@Param('telephone') telephone: string): Promise<ApiResponse<string>> {
    try {
      const data = await this.authService.sendOtp(telephone);
      return new ApiResponse<string>(true, "OTP Sent Successfully", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @Allow()
  @Post('signup/dev-admin')
  async registerDevAdmin(@Body() createDevAdminDto: CreateDevAdminDto) {
    try {
      const data = await this.authService.createDevAdmin(createDevAdminDto);
      return new ApiResponse(true, "Created Dev Admin Successfully", data, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Get('profile')
  async getCurrentUser(@CurrentUser() user: User): Promise<ApiResponse<User>> {
    try {
      return new ApiResponse(true, "User profile retrieved", user, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  // Initiate Password Reset
  @Allow()
  @Post('password-reset/initiate/:email')
  @ApiParam({ name: 'email', type: String })
  async initiatePasswordReset(@Param('email') email: string): Promise<ApiResponse<string>> {
    try {
      if (!email) {
        throw new BadRequestException('Email is required');
      }
      await this.authService.initiatePasswordReset(email);
      return new ApiResponse<string>(
        true,
        "Password reset code sent to email",
        'Password reset initiation successful. Check your email for the reset code.',
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  // Reset Password
  @Allow()
  @Post('password-reset/complete')
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDTO
  ): Promise<ApiResponse<string>> {
    try {
      await this.authService.resetPassword(
        resetPasswordDto.email,
        resetPasswordDto.code,
        resetPasswordDto.newPassword
      );
      return new ApiResponse<string>(
        true,
        "Password reset successful",
        'Password reset successful. You can now login with your new password.',
        200
      );
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }

  // Validate Reset Code
  @Allow()
  @Post('password-reset/validate')
  async validateResetCode(
    @Body() validateCodeDto: ValidateCodeDTO
  ): Promise<ApiResponse<boolean>> {
    try {
      const isValid = await this.authService.validateCode(
        validateCodeDto.email,
        validateCodeDto.code
      );
      return new ApiResponse<boolean>(true, "Code validation successful", isValid, 200);
    } catch (e) {
      return new ApiResponse(false, e.message, null, 400);
    }
  }
}