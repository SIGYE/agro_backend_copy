import { ApiProperty } from "@nestjs/swagger";
import { MetricType } from "@prisma/client";
import { IsString, IsOptional, IsUUID, IsNumber, IsEnum } from "class-validator";



export class CreateMetricDto {
    @ApiProperty()
    @IsString()
    name: string;

    @ApiProperty({ description: 'Unit of measurement (e.g., kg, liter, percent)' })
    @IsString()
    unit: string;

    @ApiProperty({ enum: MetricType, required: false })
    @IsEnum(MetricType)
    @IsOptional()
    metricType?: MetricType;

    @ApiProperty({ required: false, description: 'ID of the base metric for derived metrics' })
    @IsUUID()
    @IsOptional()
    baseMetricId?: string;

    @ApiProperty({ required: false, description: 'Conversion factor to base metric (for simple conversions)' })
    @IsNumber()
    @IsOptional()
    coefficient?: number;
}