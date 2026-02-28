import { apiFetch } from './client.js';
import type { UserCreate } from '@dispatch/shared/types/user';
import type { Role } from '@dispatch/shared/constants/roles';

interface AuthResponse {
  accessToken: string;
  user: {
    sub: string;
    email: string;
    roles: Role[];
    homeTerminalId: string | null;
  };
}

export async function login(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function logout(): Promise<void> {
  await apiFetch<{ message: string }>('/api/auth/logout', {
    method: 'POST',
  });
}

export async function refreshAccessToken(): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/refresh', {
    method: 'POST',
  });
}

export async function register(data: UserCreate): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}
