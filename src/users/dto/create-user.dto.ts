import { ApiProperty } from "@nestjs/swagger";
import { Status, Gender } from "@prisma/client";
import { Transform, Type } from "class-transformer";


import { IsEmail, IsOptional, IsNotEmpty, IsString, MinLength, MaxLength, Matches, Min, Max, Length, IsEnum } from "class-validator";
import moment from "moment";


export class CreateUserDto {
    @IsNotEmpty()
    @ApiProperty()
    firstName: string

    @IsNotEmpty()
    @ApiProperty()
    lastName: string

    @ApiProperty()
    @IsOptional()
    nationalId?: string

    @IsOptional()
    @ApiProperty()
    telephone: string
    @ApiProperty()
    @IsEnum(Gender)
    gender: Gender
    @ApiProperty()
    @IsOptional()
    @IsEmail()
    email?: string
    @ApiProperty({
        type: String,
        example: 'YYYY-MM-DD'
    })

    dob: string;
    @ApiProperty()
    password?: string

    @ApiProperty()
    @IsOptional()
    @IsString()
    roleId?: string

    @ApiProperty()
    @IsOptional()
    locationId: number
    @ApiProperty()
    @IsOptional()
    country?: number

}
