import { PartialType } from '@nestjs/swagger';
import { CreatePestDto } from './create-pest.dto';

export class UpdatePestDto extends PartialType(CreatePestDto) {}
