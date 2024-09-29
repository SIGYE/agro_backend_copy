
import { SetMetadata } from '@nestjs/common';

export const Allow = () => SetMetadata('isAllowed', true);
