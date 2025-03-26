import { ApiProperty } from "@nestjs/swagger";
import { IsUUID } from "class-validator";

export class AssignMedicineToCropDto {
    @ApiProperty({ description: 'ID of the crop' })
    @IsUUID()
    cropId: string;

    @ApiProperty({ description: 'ID of the medicine' })
    @IsUUID()
    medicineId: string;
}