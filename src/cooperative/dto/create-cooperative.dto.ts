import { IsString, IsNotEmpty, IsInt, IsOptional } from 'class-validator';

export class CreateCooperativeDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsString()
    @IsNotEmpty()
    telephone: string;

    @IsString()
    @IsNotEmpty()
    registrationNumber: string;

    @IsInt()
    @IsNotEmpty()
    membersNumber: number;

    @IsInt()
    @IsNotEmpty()
    locationId: number;
}