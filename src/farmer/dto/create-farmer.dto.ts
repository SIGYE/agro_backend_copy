import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@prisma/client";

import { IsEmail, IsOptional, IsNotEmpty, IsString, MinLength, MaxLength, Matches, Min, Max, Length } from "class-validator";

export class CreateFarmerDto {
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
    @IsEmail()
    email: string

    @ApiProperty()
    @IsOptional()
    @IsString()
    roleId?: string

    @ApiProperty()
    @IsNotEmpty()
    locationId: number
    @ApiProperty()
    @IsOptional()
    cropsId: string[]
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    plantationArea: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    seeds: string
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    produceHarvested: string

}
