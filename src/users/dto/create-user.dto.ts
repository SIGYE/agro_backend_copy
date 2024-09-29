import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@prisma/client";
import { IsEmail, IsOptional ,  IsNotEmpty, IsString, MinLength, MaxLength, Matches, Min, Max, Length } from "class-validator";

export class CreateUserDto {
    @IsNotEmpty()
    @ApiProperty()
    firstName: string
    
    @IsNotEmpty()
    @ApiProperty()
    lastName: string

    @Length(16 , 16)
    @IsNotEmpty()
    @ApiProperty()
    nationalId : string

    @IsOptional()
    @ApiProperty()
    @IsString()
    @Length(12)
    @Matches(/^250\d{9}$/)
    telephone : string 

    @ApiProperty()
    @IsEmail()
    email: string
    @IsNotEmpty()
    @IsString()
    @MinLength(6)
    @MaxLength(16)
    @ApiProperty()
    @Matches(/^(?=.*[A-Z])(?=.*\d)(?=.*[\W_])[A-Za-z\d\W_]{6,}$/, {
        message: 'Password must have at least 6 characters, one symbol, one number, and one uppercase letter.',
    })
    password: string
    @ApiProperty()
    status?: Status


    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    roleId : string 

    @ApiProperty()
    @IsNotEmpty()
    locationId : number
}
