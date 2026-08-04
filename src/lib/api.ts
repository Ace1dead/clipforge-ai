const API_BASE = '/api';

export interface ApiUser {
  id: number;
  email: string;
  display_name: string;
  role: 'user' | 'admin';
  credits: number;
  plan: string;
  created_at: string;
}

export interface AuthResponse {
  user: ApiUser;
  accessToken: string;
  refreshToken: string;
  sessionId: string;
}

let accessToken: string | null = localStorage.getItem('cf_api_token');
let refreshToken: string | null = localStorage.getItem('cf_api_refresh');
let currentUser: ApiUser | null = null;

try {
  const stored = localStorage.getItem('cf_api_user');
  if (stored) currentUser = JSON.parse(stored);
} catch { /* ignore */ }

function saveAuth(res: AuthResponse): void {
  accessToken = res.accessToken;
  refreshToken = res.refreshToken;
  currentUser = res.user;
  localStorage.setItem('cf_api_token', res.accessToken);
  localStorage.setItem('cf_api_refresh', res.refreshToken);
  localStorage.setItem('cf_api_user', JSON.stringify(res.user));
}

export function getApiToken(): string | null { return accessToken; }
export function getApiUser(): ApiUser | null { return currentUser; }

export function clearAuth(): void {
  accessToken = null;
  refreshToken = null;
  currentUser = null;
  localStorage.removeItem('cf_api_token');
  localStorage.removeItem('cf_api_refresh');
  localStorage.removeItem('cf_api_user');
}

async function apiFetch(path: string, opts: RequestInit = {}): Promise<any> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(opts.headers as any) };
  if (accessToken) headers['Authorization'] = `Bearer ${accessToken}`;
  const res = await fetch(`${API_BASE}${path}`, { ...opts, headers });
  const text = await res.text();
  let data: any;
  try { data = JSON.parse(text); } catch {
    throw new Error(`Server returned HTML instead of JSON — is the server running?`);
  }
  if (!res.ok) throw new Error(data.error || `API error ${res.status}`);
  return data;
}

export async function apiRegister(email: string, password: string, displayName?: string): Promise<AuthResponse> {
  const data = await apiFetch('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  saveAuth(data);
  return data;
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  const data = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  saveAuth(data);
  return data;
}

export async function apiAdminLogin(email: string, adminKey: string): Promise<AuthResponse> {
  const data = await apiFetch('/auth/admin-login', {
    method: 'POST',
    body: JSON.stringify({ email, adminKey }),
  });
  saveAuth(data);
  return data;
}

export async function apiLogout(): Promise<void> {
  try { await apiFetch('/auth/logout', { method: 'POST' }); } catch { /* ignore */ }
  clearAuth();
}

export async function apiGetMe(): Promise<ApiUser | null> {
  if (!accessToken) return null;
  try {
    const data = await apiFetch('/auth/me');
    currentUser = data.user;
    localStorage.setItem('cf_api_user', JSON.stringify(currentUser));
    return currentUser;
  } catch {
    clearAuth();
    return null;
  }
}
