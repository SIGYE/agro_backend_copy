import { DiseaseType } from "@prisma/client";

export interface BulkDiseaseDto {
    name: string;
    type: DiseaseType;
    medication: string;
}