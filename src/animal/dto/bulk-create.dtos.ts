import { IsString, IsArray, IsOptional, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';

export class BulkAnimalProductDto {
    @IsString()
    name: string;
}

export class BulkBreedDto {
    @IsString()
    breedName: string;
}

export class BulkAnimalDiseaseDto {
    @IsString()
    name: string;

    @IsEnum(['LIVESTOCK', 'CROP'])
    type: 'LIVESTOCK' | 'CROP';

    @IsString()
    medication: string;
}

export class BulkAnimalPestDto {
    @IsString()
    name: string;

    @IsEnum(['LIVESTOCK', 'CROP'])
    type: 'LIVESTOCK' | 'CROP';

    @IsString()
    medication: string;
}
export class AnimalNameDto {
    @IsString()
    name: string
    @IsString()
    languageName: string
    @IsString()
    languageCode: string
    @IsOptional()
    @IsString()
    animalId?: string

}

export class BulkAnimalDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => AnimalNameDto)
    names?: AnimalNameDto[];
    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkBreedDto)
    breeds?: BulkBreedDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkAnimalProductDto)
    animalProducts?: BulkAnimalProductDto[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    vaccines?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    medicines?: string[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkAnimalDiseaseDto)
    diseases?: BulkAnimalDiseaseDto[];

    @IsOptional()
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkAnimalPestDto)
    pests?: BulkAnimalPestDto[];
}

export class BulkCreateAnimalDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => BulkAnimalDto)
    animals: BulkAnimalDto[];
}
