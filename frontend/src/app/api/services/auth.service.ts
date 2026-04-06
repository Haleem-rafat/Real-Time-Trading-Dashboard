import api from '..';
import { EAPI } from '@constants/endpoints';
import type { IApiResponse } from '../types/api.types';
import type {
  IAuthResponse,
  ILoginPayload,
  IRegisterPayload,
  IUser,
} from '../types/auth.types';

class AuthService {
  public async register(payload: IRegisterPayload): Promise<IAuthResponse> {
    const { data } = await api.post<IApiResponse<IAuthResponse>>(
      EAPI.AUTH_REGISTER,
      payload,
    );
    return data.data;
  }

  public async login(payload: ILoginPayload): Promise<IAuthResponse> {
    const { data } = await api.post<IApiResponse<IAuthResponse>>(
      EAPI.AUTH_LOGIN,
      payload,
    );
    return data.data;
  }

  public async me(): Promise<IUser> {
    const { data } = await api.get<IApiResponse<IUser>>(EAPI.AUTH_ME);
    return data.data;
  }
}

export default Object.freeze(new AuthService());
