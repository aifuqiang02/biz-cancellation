import { defineStore } from "pinia";
import { ref, computed } from "vue";
import { authService, type User, type LoginData, type RegisterData } from "@/services/auth";

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("token"));
  const user = ref<User | null>(null);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const isAuthenticated = computed(() => !!token.value);

  const setToken = (newToken: string | null) => {
    token.value = newToken;
    if (newToken) {
      localStorage.setItem("token", newToken);
    } else {
      localStorage.removeItem("token");
    }
  };

  const setUser = (newUser: User | null) => {
    user.value = newUser;
  };

  const setLoading = (value: boolean) => {
    loading.value = value;
  };

  const setError = (message: string | null) => {
    error.value = message;
  };

  const login = async (data: LoginData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.login(data);
      if (response.code == 200) {
        setToken(response.data.token);
        setUser(response.data.user);
      } else {
        setError(response.msg);
      }
      return response;
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterData) => {
    try {
      setLoading(true);
      setError(null);

      const response = await authService.register(data);
      if (response.code == 200) {
        setToken(response.data.token);
        setUser(response.data.user);
      } else {
        setError(response.msg);
        throw new Error(response.msg);
      }
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ||
        "Registration failed";
      setError(message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    setError(null);
  };

  const checkAuth = async () => {
    if (!token.value) return false;

    try {
      setLoading(true);
      const response = await authService.getCurrentUser();
      if (response.code == 200) {
        setUser(response.data);
      } else {
        throw new Error(response.msg);
      }
      return true;
    } catch {
      logout();
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    // State
    token,
    user,
    loading,
    error,

    // Getters
    isAuthenticated,

    // Actions
    login,
    register,
    logout,
    checkAuth,
  };
});
