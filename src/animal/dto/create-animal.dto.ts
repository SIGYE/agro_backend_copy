import { ApiProperty } from "@nestjs/swagger"
import { Purpose } from "@prisma/client"
import { IsNotEmpty } from "class-validator"

export class CreateAnimalDto {
    @IsNotEmpty()
    @ApiProperty()
    name: string
    @IsNotEmpty()
    @ApiProperty({
        enum: Purpose,
        isArray: false,
        example: [Purpose.DAIRY, Purpose.MEAT, Purpose.WORK, Purpose.OTHER]

    })
    purpose: Purpose

}
