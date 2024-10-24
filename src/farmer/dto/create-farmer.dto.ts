import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@prisma/client";

import { IsEmail, IsOptional, IsNotEmpty, IsString, MinLength, MaxLength, Matches, Min, Max, Length, ValidateNested } from "class-validator";
import { CreateUserDto } from "src/users/dto/create-user.dto";
import { cropFarmerDto } from "./crop-farmer.dto";
import { animalFarmerDto } from "./animal-famer.dto";
import { Type } from "class-transformer";

export class CreateFarmerDto extends CreateUserDto {
    @ApiProperty({
        isArray: true,
        type: cropFarmerDto
    })
    @ValidateNested({ each: true })
    @Type(() => cropFarmerDto)
    @IsOptional()
    crops?: cropFarmerDto[]
    @ApiProperty({
        isArray: true,
        type: animalFarmerDto
    })
    @ValidateNested({ each: true })
    @Type(() => animalFarmerDto)
    @IsOptional()
    animals?: animalFarmerDto[]




}
