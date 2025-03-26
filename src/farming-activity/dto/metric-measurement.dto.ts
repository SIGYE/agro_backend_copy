import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsUUID } from "class-validator";

export class MetricMeasurementDto {
    @ApiProperty({ description: 'ID of the metric' })
    @IsUUID()
    metricId: string;

    @ApiProperty({ description: 'Value of the measurement' })
    @IsNumber()
    value: number;
}