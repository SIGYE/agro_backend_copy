import { ApiProperty } from "@nestjs/swagger"
import { Purpose } from "@prisma/client"
import { IsEnum, IsNotEmpty } from "class-validator"

export class CreateAnimalDto {
    @IsNotEmpty()
    @ApiProperty()
    name: string
    @IsNotEmpty()
    @ApiProperty()
    @IsEnum(Purpose)
    purpose: Purpose

}
