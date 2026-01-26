import { api } from './client';

export interface RegisterData {
  email: string;
  password: string;
  name?: string;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
}

export const authApi = {
  register(data: RegisterData): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/register', data);
  },

  login(data: LoginData): Promise<AuthResponse> {
    return api.post<AuthResponse>('/auth/login', data);
  },
};
