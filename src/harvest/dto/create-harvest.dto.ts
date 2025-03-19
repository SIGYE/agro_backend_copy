import { ApiProperty } from "@nestjs/swagger";
import { IsDateString, IsNumber, IsString } from "class-validator";

export class CreateHarvestDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'Amount harvested' })
    @IsNumber()
    amount: number;

    @ApiProperty({ example: '2025-10-15T00:00:00.000Z' })
    @IsDateString()
    harvestDate: string;

    @ApiProperty({ description: 'ID of the related season' })
    @IsString()
    seasonId: string;
}