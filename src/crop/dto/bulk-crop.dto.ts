import { BulkDiseaseDto } from "./bulk-disease.dto";
import { BulkPestDto } from "./bulk-pest.dto";

export interface BulkCropDto {
    name: string;
    cropTypes?: BulkCropTypeDto[];
    fertilizers?: string[];
    diseases?: BulkDiseaseDto[];
    pests?: BulkPestDto[];
    medicines?: string[];
}