import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { JwtPayload } from '../common/decorators/user-from-payload.decorator';
import type { AuthSocket } from './interfaces/auth-socket.interface';

export type WSNext = (err?: Error) => void;

/**
 * Returns a Socket.IO server middleware that verifies a JWT from
 * the handshake. Tokens may be provided as either:
 *   io(url, { auth: { token } })
 *   io(url, { extraHeaders: { Authorization: 'Bearer ...' } })
 *
 * If `allowAnonymous` is true, missing/invalid tokens are accepted
 * (useful for the demo / dev). Otherwise the connection is rejected.
 */
export function createWSAuthMiddleware(
  jwtService: JwtService,
  allowAnonymous: boolean,
) {
  const logger = new Logger('WSAuth');

  return (socket: AuthSocket, next: WSNext) => {
    const authToken = socket.handshake.auth?.token as string | undefined;
    const headerToken = socket.handshake.headers?.authorization
      ?.toString()
      .replace(/^Bearer\s+/i, '');
    const token = authToken ?? headerToken;

    if (!token) {
      if (allowAnonymous) {
        socket.data = {};
        return next();
      }
      logger.warn(`Connection rejected (${socket.id}): missing token`);
      return next(new Error('Unauthorized: missing token'));
    }

    try {
      const payload = jwtService.verify<JwtPayload>(token);
      socket.data = { user: payload };
      return next();
    } catch (err) {
      if (allowAnonymous) {
        socket.data = {};
        return next();
      }
      logger.warn(
        `Connection rejected (${socket.id}): ${(err as Error).message}`,
      );
      return next(new Error('Unauthorized: invalid token'));
    }
  };
}
