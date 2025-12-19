import { Type } from "class-transformer";
import { ArrayMinSize, IsArray, ValidateNested } from "class-validator"
import { AnimalNameDto } from "./bulk-create.dtos";

export class CreateAnimalDto {
    @IsArray()
    @ArrayMinSize(1)
    @ValidateNested({ each: true })
    @Type(() => AnimalNameDto)
    names: AnimalNameDto[];
}
