import { ApiProperty } from "@nestjs/swagger";
import { IsNumber, IsOptional, IsUUID } from "class-validator";

export class ActivityItemDto {
    @ApiProperty({ description: 'ID of the medicine/vaccine/fertilizer' })
    @IsUUID()
    id: string;

    @ApiProperty({ description: 'Optional amount/dosage', required: false })
    @IsNumber()
    @IsOptional()
    amount?: number;
    @ApiProperty({ description: 'ID of the Disease' })
    diseaseId?: string;
    @ApiProperty({ description: 'ID of the Pest' })
    pestId?: string;

}