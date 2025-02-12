import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsDateString, IsInt, IsOptional } from "class-validator";


export class HarvestQueryDto {

    @IsOptional()
    @IsDateString()
    @ApiProperty()
    startDate?: string;

    @IsOptional()
    @IsDateString()
    @ApiProperty()
    endDate?: string;

    @IsOptional()
    @Type(() => String)
    @ApiProperty()
    cropTypeId?: string;
    @IsOptional()
    @IsInt()
    @Type(() => Number)
    @ApiProperty()
    locationId?: number;

}
