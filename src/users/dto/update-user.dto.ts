import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNotEmpty } from 'class-validator';

export class UpdateUserDto{

    @IsOptional()
    @IsNotEmpty()
    @ApiProperty()
    firstName: string;

    @IsOptional()
    @IsNotEmpty()
    @ApiProperty()
    lastName: string;

    @IsOptional()
    @IsNotEmpty()
    @ApiProperty()
    email: string;
 }
