import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, IsUUID, ValidateNested } from "class-validator";
import { cooperativeCropDto } from "./cooperative-crop.dto";
import { Type } from "class-transformer";

export class AssignCropsToCooperativeDto {
    @ApiProperty()
    @IsNotEmpty()
    @IsUUID()
    cooperativeId: string;
    
    @ApiProperty({
        isArray: true,
        type: cooperativeCropDto
    })
    @ValidateNested({ each: true })
    @Type(() => cooperativeCropDto)
    crops: cooperativeCropDto[];
}

