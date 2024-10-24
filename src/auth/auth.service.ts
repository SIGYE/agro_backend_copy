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



export type TokenProps = {
  id: string
  email: string
  userName: string
  role: Role
  status: Status
}

type UserWithRoles = Prisma.UserGetPayload<{
  include: {
    role: true
  }
}>;

@Injectable()
export class AuthService {
  constructor(private readonly mailService: MailService, private readonly databaseService: DatabaseService, private readonly userService: UsersService, private readonly jwtService: JwtService) { }

  validateAll = async (credential: string): Promise<number> => {
    // Check if the credential is a valid email address
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (emailPattern.test(credential)) {
      return 1;
    }

    // Check if the credential matches the pattern for a Rwandan phone number
    const phoneNumberPattern = /^250\d{9}$/;
    if (phoneNumberPattern.test(credential)) {
      return 2;
    }

    // If neither of the above conditions are met, return 3
    return 3;
  };


  // async createDevAdmin(createDevAdmin : CreateDevAdminDto) : Promise<User> {
  //     // check if the registration code is valid 
  //     if(createDevAdmin.registration_code == process.env.DEV_ADMIN_KEY){
  //         createDevAdmin.password = await bcrypt.hash(createDevAdmin.password, 10)
  //         let usersnumber = await this.databaseService.user.count();
  //         const username = createDevAdmin.firstName.toLowerCase()  + usersnumber; 

  //         let userPresent = await this.databaseService.user.findFirst({
  //             where: {
  //               OR: [
  //                 { email: createDevAdmin.email },
  //                 { telephone: createDevAdmin.telephone },
  //                 {nationalId :  createDevAdmin.nationalId}
  //               ]
  //             }
  //           });


  //         if(userPresent){
  //           throw new BadRequestException("The user with email , natinal Id or telephone already exists")
  //         }


  //         let user : User = await await this.databaseService.user.create({
  //           data: {
  //             firstName: createDevAdmin.firstName,
  //             lastName: createDevAdmin.lastName,
  //             email: createDevAdmin.email,   
  //             nationalId : createDevAdmin.nationalId,
  //             password: createDevAdmin.password,
  //             status: createDevAdmin.status,
  //             username: username,
  //             telephone: createDevAdmin.telephone,
  //             role : {
  //               connect : 
  //                {
  //                    name : 'DEV_ACCESS'
  //                }
  //            }
  //           }
  //         });
  //         user = excludeFields(user , ['password'])
  //         this.mailService.sendWelcomeEmail(createDevAdmin.email , 'Innovative VAS')
  //         return user;
  //     }else{
  //         throw new BadRequestException("Invalid Registration Key")
  //     }
  // }

  async sendOtp(telephone: string): Promise<string> {
    let user = await this.databaseService.user.findUnique({
      where: {
        telephone: telephone
      }
    })

    if (!user) {
      throw new UnauthorizedException("The user with the given phone number was not found")
    }

    // send the otp 
    let otp = codeGenerator()
    await this.databaseService.user.update({
      where: {
        id: user.id
      },
      data: {
        otp
      }
    })

    const message: Message = {
      id: user.id,
      content: otp
    }
    // send the otp 
    return await sendSms(telephone, message)
  }


  async loginWithOtp(otpLogin: OtpLoginDto): Promise<LoginPayload> {
    let user: UserWithRoles = await this.databaseService.user.findUnique({
      where: {
        telephone: otpLogin.telephone
      },
      include: {
        role: true
      }
    })

    if (!user) {
      throw new UnauthorizedException("The user with the given id was not found")
    }

    // validate the otp 
    if (user.otp == null) {
      throw new UnauthorizedException("No Session was found for this user")
    }

    if (user.otp != otpLogin.otp) {
      throw new UnauthorizedException("Invalid OTP")
    }

    // allown login and delete the otp 
    await this.databaseService.user.update({
      where: {
        id: user.id
      },
      data: {
        otp: null
      }
    })

    if (user.status == Status.INACTIVE) {
      throw new UnauthorizedException('User Account not active contact support for help');
    }

    const tokenProps: TokenProps = {
      id: user.id,
      email: user.email,
      userName: user.firstName,
      status: user.status,
      role: user.role
    }

    const loginPayload: LoginPayload = {
      id: user.id,
      email: user.email,
      userName: user.firstName,
      status: user.status,
      role: user.role,
      isDefaultPassword: user.isDefaultPassword,
      token: this.jwtService.sign(tokenProps),
      locationId: user.locationId
    };

    return loginPayload;
  }

  async login(loginDto: loginDto): Promise<LoginPayload> {
    let user: UserWithRoles = null;
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

    const tokenProps: TokenProps = {
      id: user.id,
      email: user.email,
      userName: user.firstName,
      status: user.status,
      role: user.role
    }

    const loginPayload: LoginPayload = {
      id: user.id,
      email: user.email,
      userName: user.firstName,
      status: user.status,
      role: user.role,
      isDefaultPassword: user.isDefaultPassword,
      token: this.jwtService.sign(tokenProps),
      locationId: user.locationId
    };

    return loginPayload;
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

  async validateEmailUser(email: string, password: string): Promise<UserWithRoles> {
    let user: UserWithRoles = await this.userService.findUserByEmail(email)
    if (!user) {
      throw new UnauthorizedException("User Not Found")
    }
    let isMatch: boolean = await bcrypt.compare(password, user.password)
    if (isMatch) {
      return user
    } else
      throw new UnauthorizedException("Wrong email or password")
  }

  async validatePhoneUser(telephone: string, password: string): Promise<UserWithRoles> {
    let user: UserWithRoles = await this.userService.findUserByTelephone(telephone)
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

