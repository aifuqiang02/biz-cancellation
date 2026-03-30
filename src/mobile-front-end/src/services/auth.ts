import api from "./api";

// 统一的API响应格式
export interface ApiResponse<T> {
  code: number;
  msg: string;
  data: T;
}

export interface LoginData {
  email: string;
  password: string;
}

export interface RegisterData {
  email: string;
  username: string;
  password: string;
}

export interface User {
  id: string;
  email: string;
  username: string;
}

// 修改为匹配新的统一响应格式
export interface AuthResponse {
  token: string;
  user: User;
}

export const authService = {
  async login(data: LoginData): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post("/auth/login", data);
    return response.data;
  },

  async register(data: RegisterData): Promise<ApiResponse<AuthResponse>> {
    const response = await api.post("/auth/register", data);
    return response.data;
  },

  async getCurrentUser(): Promise<ApiResponse<User>> {
    const response = await api.get("/auth/me");
    return response.data;
  },
};
