import { IsUUID } from "class-validator";

export class FindOneParam {
    @IsUUID()
    id: string
}