import { ApiProperty } from "@nestjs/swagger"
import { Purpose } from "@prisma/client"
import { IsEnum, IsNotEmpty, IsString } from "class-validator"

export class CreateAnimalProductDto {
    @IsNotEmpty()
    @ApiProperty()
    name: string
    @ApiProperty()
    @IsString()
    @IsNotEmpty()
    animalId: string



}
