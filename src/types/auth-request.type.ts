import { Request } from 'express';
import { TokenProps } from 'src/auth/auth.service';


export interface AuthRequest extends Request {
  user?: TokenProps;
}