import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Register from './pages/Register';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

const Home: React.FC = () => {
  const isLoggedIn = !!localStorage.getItem('token');

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <div className="text-center py-12">
        <div className="inline-block mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 rounded-3xl flex items-center justify-center shadow-xl">
            <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </div>
        
        <h1 className="text-5xl font-bold text-gray-900 dark:text-gray-100 mb-4">
          欢迎来到 <span className="bg-gradient-to-r from-blue-600 to-blue-700 dark:from-blue-400 dark:to-blue-500 bg-clip-text text-transparent">ImageHub</span>
        </h1>
        <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-8">
          一个现代化、功能强大的图片管理系统。轻松上传、管理和组织您的照片收藏。
        </p>
        
        <div className="flex gap-4 justify-center">
          {isLoggedIn ? (
            <Link to="/dashboard" className="btn btn-primary px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all">
              进入图片库
            </Link>
          ) : (
            <>
              <Link to="/register" className="btn btn-primary px-8 py-3 text-lg shadow-lg hover:shadow-xl transition-all">
                开始使用
              </Link>
              <Link to="/login" className="btn btn-outline px-8 py-3 text-lg">
                登录
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Features Section */}
      <div className="grid md:grid-cols-3 gap-8 py-12">
        <div className="card p-6 text-center hover:shadow-xl transition-all">
          <div className="w-14 h-14 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">轻松上传</h3>
          <p className="text-gray-600 dark:text-gray-300">支持拖拽上传，一次可上传多张图片，操作简单便捷</p>
        </div>

        <div className="card p-6 text-center hover:shadow-xl transition-all">
          <div className="w-14 h-14 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">智能标签</h3>
          <p className="text-gray-600 dark:text-gray-300">为图片添加标签，快速分类和查找您的照片</p>
        </div>

        <div className="card p-6 text-center hover:shadow-xl transition-all">
          <div className="w-14 h-14 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">EXIF 信息</h3>
          <p className="text-gray-600 dark:text-gray-300">自动提取照片的拍摄信息、位置和相机参数</p>
        </div>
      </div>

      {/* Stats Section */}
      <div className="card p-8">
        <div className="grid md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-4xl font-bold text-blue-600 dark:text-blue-400 mb-2">快速</div>
            <p className="text-gray-600 dark:text-gray-300">毫秒级的图片加载速度</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-green-600 dark:text-green-400 mb-2">安全</div>
            <p className="text-gray-600 dark:text-gray-300">您的图片安全私密存储</p>
          </div>
          <div>
            <div className="text-4xl font-bold text-purple-600 dark:text-purple-400 mb-2">简单</div>
            <p className="text-gray-600 dark:text-gray-300">直观易用的操作界面</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/register" element={<Register />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;