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

    @Length(16, 16)
    @IsNotEmpty()
    @ApiProperty()
    nationalId: string

    @IsOptional()
    @ApiProperty()
    @IsString()
    @Length(12)
    @Matches(/^250\d{9}$/)
    telephone: string
    @ApiProperty()
    @IsEnum(Gender)
    gender: Gender
    @ApiProperty()
    @IsEmail()
    email: string
    @ApiProperty({
        type: String,
        example: 'YYYY-MM-DD'
    })
    @Transform(({ value }) => moment(value).format('YYYY-MM-DD'))
    dob: string;
    @ApiProperty()
    password?: string

    @ApiProperty()
    @IsOptional()
    @IsString()
    roleId?: string

    @ApiProperty()
    @IsNotEmpty()
    locationId: number
}
