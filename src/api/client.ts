import axios from 'axios';

export const BASE_URL = 'http://192.168.1.100:8080';

const client = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('syncflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('syncflow_token');
      localStorage.removeItem('syncflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default client;