export interface IUser {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  created_at: string;
  updated_at: string;
}

export interface IAuthResponse {
  access_token: string;
  user: IUser;
}

export interface IRegisterPayload {
  email: string;
  password: string;
  first_name?: string;
  last_name?: string;
}

export interface ILoginPayload {
  email: string;
  password: string;
}
