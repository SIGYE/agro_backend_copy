import { ApiProperty } from "@nestjs/swagger";
import { Status } from "@prisma/client";

import { IsEmail, IsOptional, IsNotEmpty, IsString, MinLength, MaxLength, Matches, Min, Max, Length } from "class-validator";
import { CreateUserDto } from "src/users/dto/create-user.dto";
import { cropFarmerDto } from "./crop-farmer.dto";
import { animalFarmerDto } from "./animal-famer.dto";

export class CreateFarmerDto extends CreateUserDto {
    @ApiProperty()
    @IsOptional()
    crops?: cropFarmerDto[]
    @ApiProperty()
    @IsOptional()
    animals?: animalFarmerDto[]




}
