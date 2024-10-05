import { ApiProperty } from "@nestjs/swagger"
import { IsNotEmpty, IsString } from "class-validator"

export class AssignFarmersTOCooperative {
    @ApiProperty()
    @IsNotEmpty()
    @IsString()
    cooperativeId: string
    @ApiProperty()
    farmers: string[]
}