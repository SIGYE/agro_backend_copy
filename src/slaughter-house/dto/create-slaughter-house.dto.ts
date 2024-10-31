import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString, ValidateNested } from "class-validator";
import { SlaughterAnimalDto } from "./slaughter-animal.dto";
import { Type } from "class-transformer";

export class CreateSlaughterHouseDto {
    @ApiProperty()
    @IsString()
    name: string;
    @ApiProperty()
    @IsString()
    telephone: string;
    @ApiProperty({
        isArray: true,
        type: SlaughterAnimalDto
    })
    @ValidateNested({ each: true })
    @Type(() => SlaughterAnimalDto)
    @IsOptional()
    slaughterAnimalRegistrations: SlaughterAnimalDto[];

}
