import { ApiProperty } from "@nestjs/swagger"

export class AssignPestDto {
    @ApiProperty()
    pestId: string
    @ApiProperty()
    crops: string[]
    @ApiProperty()
    animals: string[]
}