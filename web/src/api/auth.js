/* 鉴权接口（契约 §2 / server routes/auth.js） */
import { client } from './client.js';

export const register = (account, password) => client.post('/auth/register', { account, password });
export const login = (account, password) => client.post('/auth/login', { account, password });
export const logout = (refreshToken) => client.post('/auth/logout', { refreshToken });
export const refresh = (refreshToken) => client.post('/auth/refresh', { refreshToken });
