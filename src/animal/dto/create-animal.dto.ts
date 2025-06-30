import { ApiProperty } from "@nestjs/swagger"
import { Purpose } from "@prisma/client"
import { Type } from "class-transformer";
import { IsArray, IsEnum, IsNotEmpty, ValidateNested } from "class-validator"
import { AnimalNameDto } from "./bulk-create.dtos";

export class CreateAnimalDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnimalNameDto)
    names?: AnimalNameDto[];

}
