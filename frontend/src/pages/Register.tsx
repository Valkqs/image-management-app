import React, { useState } from 'react';
import apiClient from '../api/client';
import axios, { AxiosError } from 'axios'; // 导入 AxiosError 用于类型判断

// 为后端错误响应定义一个接口
interface ApiError {
  error: string;
}

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
  });
  const [message, setMessage] = useState<string>('');
  const [error, setError] = useState<string>('');

  // 为 input 的 change 事件添加类型
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // 为 form 的 submit 事件添加类型
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const response = await apiClient.post('/users/register', formData);
      setMessage(response.data.message);
      setFormData({ username: '', email: '', password: '' }); // 成功后清空表单
    } catch (err) {
      // 使用类型守卫来安全地处理错误
      if (axios.isAxiosError(err) && err.response) {
        const apiError = err.response.data as ApiError;
        setError(apiError.error || 'Registration failed. Please try again.');
      } else {
        setError('An unexpected error occurred.');
      }
    }
  };

  return (
    <div>
      <h2>Register</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="username" placeholder="Username" value={formData.username} onChange={handleChange} required />
        <input type="email" name="email" placeholder="Email" value={formData.email} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
        <button type="submit">Register</button>
      </form>
      {message && <p style={{ color: 'green' }}>{message}</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
    </div>
  );
};

export default Register;