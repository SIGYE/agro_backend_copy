import { ApiProperty } from "@nestjs/swagger";
import { Activities } from "@prisma/client";
import { Type } from "class-transformer";
import { IsArray, IsDateString, IsEnum, IsNumber, IsOptional, IsString, ValidateNested } from "class-validator";
import { ActivityItemDto } from "./activity-item.dto";
import { MetricMeasurementDto } from "./metric-measurement.dto";


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

    @ApiProperty({ description: 'Medicines to be applied', required: false, type: [ActivityItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActivityItemDto)
    @IsOptional()
    medicines?: ActivityItemDto[];

    @ApiProperty({ description: 'Vaccines to be administered', required: false, type: [ActivityItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActivityItemDto)
    @IsOptional()
    vaccines?: ActivityItemDto[];

    @ApiProperty({ description: 'Fertilizers to be applied', required: false, type: [ActivityItemDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ActivityItemDto)
    @IsOptional()
    fertilizers?: ActivityItemDto[];

    @ApiProperty({ description: 'Metrics to be recorded', required: false, type: [MetricMeasurementDto] })
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => MetricMeasurementDto)
    @IsOptional()
    metrics?: MetricMeasurementDto[];

    @ApiProperty({ description: 'General amount value (if applicable)', required: false })
    @IsNumber()
    @IsOptional()
    amount?: number;
}