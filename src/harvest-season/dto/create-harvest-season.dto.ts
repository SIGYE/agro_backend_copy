import { ApiProperty } from "@nestjs/swagger";
import { SeasonStatus } from "@prisma/client";
import { IsDateString, IsEnum, IsString } from "class-validator";

export class CreateHarvestSeasonDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ example: '2025-04-01T00:00:00.000Z' })
    @IsDateString()
    startDate: string;

    @ApiProperty({ example: '2025-10-31T00:00:00.000Z' })
    @IsDateString()
    endDate: string;
    @ApiProperty({ enum: SeasonStatus })
    @IsEnum(SeasonStatus)
    seasonStatus: SeasonStatus
}