import { ApiProperty } from "@nestjs/swagger";
import { Activities } from "@prisma/client";
import { IsDateString, IsEnum, IsString } from "class-validator";


export class CreateFarmingActivityDto {
    @ApiProperty({ example: '2025-05-15T00:00:00.000Z' })
    @IsDateString()
    date: string;

    @ApiProperty({ enum: Activities, description: 'Type of farming activity' })
    @IsEnum(Activities)
    activity: Activities;

    @ApiProperty({ description: 'ID of the related season' })
    @IsString()
    seasonId: string;
}