import { PestType } from "@prisma/client";

export interface BulkPestDto {
    name: string;
    type: PestType;
    medication: string;
}