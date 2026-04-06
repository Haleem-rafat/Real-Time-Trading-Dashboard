import { Socket } from 'socket.io';
import type { JwtPayload } from '../../common/decorators/user-from-payload.decorator';

export interface AuthSocketData {
  user?: JwtPayload;
}

export interface AuthSocket extends Socket {
  data: AuthSocketData;
}
