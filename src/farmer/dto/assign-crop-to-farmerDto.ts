import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID } from "class-validator";

export class AssignCropToFarmerDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    farmerId: string
    @ApiProperty()
    @IsNotEmpty()
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