import { ApiProperty } from "@nestjs/swagger"

export class AssignDiseaseDto {
    @ApiProperty()
    diseaseId: string
    @ApiProperty()
    crops: string[]
    @ApiProperty()
    animals: string[]
}