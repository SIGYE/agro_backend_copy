import { BadRequestException, Injectable, InternalServerErrorException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { loginDto } from './dto/login.dto';
import { UsersService } from 'src/users/users.service';
import { Prisma, User, Status, Role } from '@prisma/client';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { LoginPayload } from 'src/categories/dto/login-payload.dto';
import { CreateDevAdminDto } from './dto/createDevAdminDto.dto';
import { DatabaseService } from 'src/database/database.service';
import { codeGenerator } from 'src/utils/data.util';
import { log } from 'console';
import { MailService } from 'src/mail/mail.service';
import { OtpLoginDto } from './dto/otp-login.dto';
import { Message, sendSms } from 'src/utils/sms.util';
import { CreateUserDto } from 'src/users/dto/create-user.dto';
import { randomInt } from 'crypto';
import { SetPasswordDto } from './dto/set-password.dto';



export type TokenProps = {
  id: string
  email: string
  userName: string
  role: Role
  status: Status
  activeRole?: string
}

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    role: true
  }
}>;

@Injectable()
export class AuthService {
  constructor(private readonly mailService: MailService, private readonly databaseService: DatabaseService, private readonly userService: UsersService, private readonly jwtService: JwtService) { }

  private otpTtlMinutes(): number {
    const value = Number(process.env.OTP_TTL_MINUTES ?? '10');
    if (Number.isFinite(value) && value > 0) return value;
    return 10;
  }

  private generateOtpCode(): string {
    return randomInt(100000, 1000000).toString();
  }

  private buildLoginPayload(user: any): LoginPayload {
    const activeRole = user.activeRole || user.role?.name || 'FARMER';
    const tokenProps: TokenProps = {
      id: user.id,
      email: user.email,
      userName: user.firstName,
      status: user.status,
      role: user.role,
      activeRole,
    }

    return {
      id: user.id,
      email: user.email,
      userName: user.firstName,
      fullName: user.firstName + " " + user.lastName,
      status: user.status,
      role: user.role,
      activeRole,
      isDefaultPassword: user.isDefaultPassword,
      token: this.jwtService.sign(tokenProps),
      locationId: user.locationId,
      cooperativeId: user?.farmer?.[0]?.cooperative?.id ?? user?.cooperativeManager?.[0]?.id,
      cooperativeName: user?.farmer?.[0]?.cooperative?.name ?? user?.cooperativeManager?.[0]?.name,
      registrationNumber: user?.farmer?.[0]?.cooperative?.registrationNumber,
      cooperativePhoneNumber: user?.farmer?.[0]?.cooperative?.telephone,
      cooperativeType: user?.farmer?.[0]?.cooperative?.type ?? user?.cooperativeManager?.[0]?.type,
      cooperativeCollectiveType: user?.farmer?.[0]?.cooperative?.collectiveType ?? user?.cooperativeManager?.[0]?.collectiveType,
      farmerId: user?.farmer?.[0]?.id
    };
  }

  private async getUserForLoginPayload(userId: string): Promise<any> {
    return await this.databaseService.user.findUnique({
      where: { id: userId },
      include: {
        role: true,
        farmer: {
          select: {
            id: true,
            cooperative: {
              select: {
                id: true,
                name: true,
                registrationNumber: true,
                telephone: true,
                type: true,
                collectiveType: true,
              }
            }
          }
        },
        cooperativeManager: {
          select: {
            id: true,
            name: true,
            registrationNumber: true,
            telephone: true,
            type: true,
            collectiveType: true,
          }
        }
      }
    })
  }

  validateAll = async (credential: string): Promise<number> => {
    // Check if the credential is a valid email address
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(credential)) {
      return 1;
    }

    // Check if the credential matches the pattern for a Rwandan phone number
    const phoneNumberPattern = /^\d+$/;
    if (phoneNumberPattern.test(credential)) {
      return 2;
    }

    // If neither of the above conditions are met, return 3
    return 3;
  };


  async createDevAdmin(createDevAdmin: CreateDevAdminDto): Promise<User> {
    // check if the registration code is valid 
    if (createDevAdmin.registration_code == process.env.DEV_ADMIN_KEY) {
      createDevAdmin.password = await bcrypt.hash(createDevAdmin.password, 10)
      let usersnumber = await this.databaseService.user.count();
      const username = createDevAdmin.firstName.toLowerCase() + usersnumber;

      let userPresent = await this.databaseService.user.findFirst({
        where: {
          OR: [
            { email: createDevAdmin.email },
            { telephone: createDevAdmin.telephone },
            { nationalId: createDevAdmin.nationalId }
          ]
        }
      });


      if (userPresent) {
        throw new BadRequestException("The user with email , nationalId or telephone already exists")
      }


      let user: User = await await this.databaseService.user.create({
        data: {
          firstName: createDevAdmin.firstName,
          lastName: createDevAdmin.lastName,
          email: createDevAdmin.email,
          nationalId: createDevAdmin.nationalId,
          password: createDevAdmin.password,
          status: Status.ACTIVE,
          username: username,
          telephone: createDevAdmin.telephone,
          role: {
            connect:
            {
              name: 'DEV_ADMIN'
            }
          }
        }
      });

      this.mailService.sendWelcomeEmail(createDevAdmin.email, 'Agro App')
      return user;
    } else {
      throw new BadRequestException("Invalid Registration Key")
    }
  }
  async createAdmin(createDevAdmin: CreateUserDto): Promise<User> {
    createDevAdmin.password = await bcrypt.hash(createDevAdmin.password, 10)
    let usersnumber = await this.databaseService.user.count();
    const username = createDevAdmin.firstName.toLowerCase() + usersnumber;

    let userPresent = await this.databaseService.user.findFirst({
      where: {
        OR: [
          { email: createDevAdmin.email },
          { telephone: createDevAdmin.telephone },
          { nationalId: createDevAdmin.nationalId }
        ]
      }
    });


    if (userPresent) {
      throw new BadRequestException("The user with email , natinal Id or telephone already exists")
    }


    let user: User = await await this.databaseService.user.create({
      data: {
        firstName: createDevAdmin.firstName,
        lastName: createDevAdmin.lastName,
        email: createDevAdmin.email,
        nationalId: createDevAdmin.nationalId,
        password: createDevAdmin.password,
        status: Status.ACTIVE,
        username: username,
        telephone: createDevAdmin.telephone,
        role: {
          connect:
          {
            name: 'ADMIN'
          }
        }
      }
    });

    this.mailService.sendWelcomeEmail(createDevAdmin.email, 'Agro App')
    return user;
  }
  async createBuyer(createBuyer: CreateUserDto): Promise<User> {
    try {
      createBuyer.password = await bcrypt.hash(createBuyer.password, 10)
      let usersnumber = await this.databaseService.user.count();
      const username = createBuyer.firstName.toLowerCase() + usersnumber;

      let userPresent = await this.databaseService.user.findFirst({
        where: {
          OR: [
            { email: createBuyer.email },
            { telephone: createBuyer.telephone },
            { nationalId: createBuyer.nationalId }
          ]
        }
      });


      if (userPresent) {
        throw new BadRequestException("The user with email , natinal Id or telephone already exists")
      }


      let user: User = await await this.databaseService.user.create({
        data: {
          firstName: createBuyer.firstName,
          lastName: createBuyer.lastName,
          email: createBuyer.email,
          nationalId: createBuyer.nationalId,
          password: createBuyer.password,
          status: Status.ACTIVE,
          username: username,
          telephone: createBuyer.telephone,
          role: {
            connect:
            {
              name: 'BUYER'
            }
          }
        }
      });

      this.mailService.sendWelcomeEmail(createBuyer.email, 'Agro App')
      return user;
    } catch (e) {
      throw new BadRequestException(e.message)
    }

  }

  async requestFarmerOnboardingOtp(telephone: string): Promise<string> {
    const user = await this.databaseService.user.findUnique({
      where: { telephone },
      include: { role: true },
    })

    if (!user) {
      throw new UnauthorizedException("The user with the given phone number was not found")
    }
    if (user.role?.name !== 'FARMER') {
      throw new UnauthorizedException("OTP onboarding is only available for farmers")
    }
    if (!user.isDefaultPassword) {
      throw new BadRequestException("Password already set. Please login with your password.")
    }

    const ttlMinutes = this.otpTtlMinutes();
    const otp = this.generateOtpCode();
    const otpHash = await bcrypt.hash(otp, 10);

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        otp: otpHash,
        otpExpiresAt: new Date(Date.now() + ttlMinutes * 60_000),
        otpUsedAt: null,
      }
    })

    const message: Message = {
      id: user.id,
      content: `Your Agro OTP is ${otp}. It expires in ${ttlMinutes} minutes.`
    }
    const smsResult = await sendSms(telephone, message)
    if (smsResult !== 'SMS Sent Successfully' && process.env.NODE_ENV !== 'production') {
      console.log(`[DEV] Farmer OTP for ${telephone}: ${otp}`)
    }
    return 'OTP Sent Successfully'
  }

  async verifyFarmerOnboardingOtp(otpLogin: OtpLoginDto): Promise<{ onboardingToken: string }> {
    const user = await this.databaseService.user.findUnique({
      where: { telephone: otpLogin.telephone },
      include: { role: true },
    })

    if (!user) {
      throw new UnauthorizedException("The user with the given phone number was not found")
    }
    if (user.role?.name !== 'FARMER') {
      throw new UnauthorizedException("OTP onboarding is only available for farmers")
    }
    if (!user.isDefaultPassword) {
      throw new BadRequestException("Password already set. Please login with your password.")
    }
    if (user.status === Status.INACTIVE) {
      throw new UnauthorizedException('User Account not active contact support for help');
    }

    if (!user.otp || user.otpUsedAt) {
      throw new UnauthorizedException("No active OTP session found for this user")
    }
    if (!user.otpExpiresAt || user.otpExpiresAt < new Date()) {
      throw new UnauthorizedException("OTP expired. Please request a new OTP.")
    }

    const isValid = await bcrypt.compare(otpLogin.otp, user.otp);
    if (!isValid) {
      throw new UnauthorizedException("Invalid OTP")
    }

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        otp: null,
        otpExpiresAt: null,
        otpUsedAt: new Date(),
      }
    })

    const onboardingToken = this.jwtService.sign(
      { id: user.id, tokenType: 'ONBOARDING' },
      { expiresIn: '15m' }
    );

    return { onboardingToken };
  }

  async setFarmerOnboardingPassword(userId: string, dto: SetPasswordDto): Promise<LoginPayload> {
    if (dto.newPassword !== dto.confirmNewPassword) {
      throw new BadRequestException("The password and confirmation passwords do not match");
    }

    const user = await this.databaseService.user.findUnique({
      where: { id: userId },
      include: { role: true },
    })

    if (!user) {
      throw new NotFoundException("The user was not found");
    }
    if (user.role?.name !== 'FARMER') {
      throw new BadRequestException("Only farmers can complete this onboarding flow");
    }
    if (!user.isDefaultPassword) {
      throw new BadRequestException("Onboarding already completed");
    }

    const newPassword = await bcrypt.hash(dto.newPassword, 12);
    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        password: newPassword,
        isDefaultPassword: false,
        otp: null,
        otpExpiresAt: null,
        otpUsedAt: null,
      }
    })

    const loginUser = await this.getUserForLoginPayload(user.id);
    if (!loginUser) {
      throw new InternalServerErrorException("Unable to load user after onboarding");
    }

    return this.buildLoginPayload(loginUser);
  }

  async setActiveRole(user: User & { role?: Role }, activeRole: string): Promise<LoginPayload> {
    // Only Umufasha can switch; other roles must keep their role
    if (user?.role?.name !== 'UMUFASHAMYUMVIRE') {
      throw new UnauthorizedException('Role switching is only available for Umufasha Myumvire');
    }
    if (!['UMUFASHAMYUMVIRE', 'FARMER'].includes(activeRole)) {
      throw new BadRequestException('Invalid active role');
    }

    // Umufasha in FARMER mode must have a Farmer profile row
    if (activeRole === 'FARMER') {
      const existingFarmer = await this.databaseService.farmer.findUnique({
        where: { userId: user.id },
        select: { id: true },
      });
      if (!existingFarmer) {
        await this.databaseService.farmer.create({
          data: { userId: user.id, cooperativeId: null },
        });
      }
    }

    await this.databaseService.user.update({
      where: { id: user.id },
      data: { activeRole },
    });

    const updated = await this.getUserForLoginPayload(user.id);
    updated.activeRole = activeRole;
    return this.buildLoginPayload(updated);
  }

  async login(loginDto: loginDto): Promise<LoginPayload> {
    let user = null;
    const credentialType = await this.validateAll(loginDto.credential);
    log("The credential type is " + credentialType);

    switch (credentialType) {
      case 1:
        user = await this.validateEmailUser(loginDto.credential, loginDto.password);
        break;
      case 2:
        user = await this.validatePhoneUser(loginDto.credential, loginDto.password);
        break;
      case 3:
        user = await this.validateUsername(loginDto.credential, loginDto.password);
        break;
      default:
        throw new UnauthorizedException('Invalid credential type');
    }

    if (!user) {
      throw new UnauthorizedException('User not found or invalid credentials');
    }

    if (user.status == Status.INACTIVE) {
      throw new UnauthorizedException('User Account not active contact support for help');
    }

    if (user.role?.name === 'FARMER' && user.isDefaultPassword) {
      throw new UnauthorizedException('First-time login requires OTP verification and password setup');
    }

    return this.buildLoginPayload(user);
  }

  // Initiate Password Reset
  async initiatePasswordReset(email: string): Promise<boolean> {
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const code: string = codeGenerator();

    await this.databaseService.user.update({
      where: { id: user.id },
      data: { code: code, resetCodeExpires: new Date(Date.now() + 3600000) }, // Code expires in 1 hour
    });

    await this.mailService.sendPasswordResetEmail(user.email, code);
    return true;
  }

  // Reset Password
  async resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user || user.code !== code || user.resetCodeExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired reset code');
    }

    newPassword = await bcrypt.hash(newPassword, 12)

    await this.databaseService.user.update({
      where: { id: user.id },
      data: {
        password: newPassword, // Ensure you hash the password before saving it!
        code: null,
        resetCodeExpires: null,
      },
    });

    return true;
  }

  // Validate Code
  async validateCode(email: string, code: string): Promise<boolean> {
    const user = await this.databaseService.user.findUnique({
      where: { email },
    });

    if (!user || user.code !== code || user.resetCodeExpires < new Date()) {
      throw new UnauthorizedException('Invalid or expired code');
    }

    return true;
  }


  async validateUsername(username: string, password: string): Promise<UserWithRoles> {
    let user: UserWithRoles = await this.userService.findUserByUsername(username)
    if (!user) {
      throw new UnauthorizedException("User Not Found")
    }
    let isMatch: boolean = await bcrypt.compare(password, user.password)
    if (isMatch) {
      return user
    } else
      throw new UnauthorizedException("Wrong username or password")
  }

  async validateEmailUser(email: string, password: string): Promise<User> {
    let user: User = await this.userService.findUserByEmail(email)
    if (!user) {
      throw new UnauthorizedException("User Not Found")
    }
    let isMatch: boolean = await bcrypt.compare(password, user.password)
    if (isMatch) {
      return user
    } else
      throw new UnauthorizedException("Wrong email or password")
  }

  async validatePhoneUser(telephone: string, password: string): Promise<any> {
    let user: User = await this.userService.findUserByTelephone(telephone)
    if (!user) {
      throw new UnauthorizedException("User Not Found")
    }
    let isMatch: boolean = await bcrypt.compare(password, user.password)
    if (isMatch) {
      return user
    } else
      throw new UnauthorizedException("Wrong telephone number or password")
  }
}
