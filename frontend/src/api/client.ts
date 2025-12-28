import axios, { type AxiosInstance } from 'axios';
import { getApiBaseURL } from '../utils/api';

// We explicitly type apiClient as an AxiosInstance for full type safety
const apiClient: AxiosInstance = axios.create({
  baseURL: `${getApiBaseURL()}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use(
  (config) => {
    // 从 localStorage 获取 token
    const token = localStorage.getItem('token');
    // 如果 token 存在，则添加到请求的 Authorization 头中
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default apiClient;