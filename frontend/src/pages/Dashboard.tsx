import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import ImageModal from '../components/ImageModal';
import Toast from '../components/Toast';
import MCPQuery from '../components/MCPQuery';
import { useToast } from '../hooks/useToast';
import { getImageURL } from '../utils/api';

// 定义图片数据类型
interface Image {
  ID: number;
  filename: string;
  filePath: string;
  thumbnailPath: string;
  userID: number;
  cameraMake?: string;
  cameraModel?: string;
  resolution?: string;
  takenAt?: string;
  latitude?: number;
  longitude?: number;
  Tags: Tag[];
}

// 定义 Tag 类型
interface Tag {
  ID: number;
  name: string;
  source?: string; // 'user' 或 'ai'
}

const Dashboard: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedImageIDs, setSelectedImageIDs] = useState<Set<number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // 搜索和筛选状态
  const [searchTags, setSearchTags] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [searchCamera, setSearchCamera] = useState('');
  const [useMCP, setUseMCP] = useState(false); // 是否使用MCP查询
  const [autoAnalyze, setAutoAnalyze] = useState(false); // 上传后自动进行AI标签分析

  const { toasts, removeToast, success, error: showError } = useToast();

  // 验证文件是否为真正的图片文件（通过检查文件头）
  const isValidImageFile = async (file: File): Promise<boolean> => {
    // 首先检查 MIME 类型
    if (!file.type.startsWith('image/')) {
      return false;
    }

    // 读取文件头（前几个字节）来验证文件类型
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer || arrayBuffer.byteLength < 4) {
          resolve(false);
          return;
        }

        const bytes = new Uint8Array(arrayBuffer);
        
        // 检查常见的图片文件头
        // JPEG: FF D8 FF
        if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
          resolve(true);
          return;
        }
        
        // PNG: 89 50 4E 47
        if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
          resolve(true);
          return;
        }
        
        // GIF: 47 49 46 38 (GIF8)
        if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
          resolve(true);
          return;
        }
        
        resolve(false);
      };
      reader.onerror = () => resolve(false);
      // 只读取前 12 个字节就足够了
      reader.readAsArrayBuffer(file.slice(0, 12));
    });
  };

  // 获取图片列表的函数
  const fetchImages = async (tags?: string, month?: string, camera?: string) => {
    try {
      setLoading(true);
      
      // 构建查询参数
      const params = new URLSearchParams();
      if (tags) params.append('tags', tags);
      if (month) params.append('month', month);
      if (camera) params.append('camera', camera);
      
      const queryString = params.toString();
      const url = queryString ? `/images?${queryString}` : '/images';
      
      const response = await apiClient.get<{ images: Image[] }>(url);
      setImages(response.data.images || []);
    } catch (error: any) {
      console.error('Failed to fetch images:', error);
      if (error.response?.status === 401) {
        showError('请先登录');
      } else {
        showError('加载图片失败');
      }
      setImages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, []);

  // 应用搜索筛选
  const handleSearch = () => {
    setSelectedImageIDs(new Set()); // 清空选择
    fetchImages(searchTags, searchMonth, searchCamera);
  };

  // 切换图片选择状态
  const toggleImageSelection = (imageID: number) => {
    const newSelected = new Set(selectedImageIDs);
    if (newSelected.has(imageID)) {
      newSelected.delete(imageID);
    } else {
      newSelected.add(imageID);
    }
    setSelectedImageIDs(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedImageIDs.size === images.length) {
      setSelectedImageIDs(new Set());
    } else {
      setSelectedImageIDs(new Set(images.map(img => img.ID)));
    }
  };

  // 批量删除图片
  const handleBatchDelete = async () => {
    if (selectedImageIDs.size === 0) {
      showError('请先选择要删除的图片');
      return;
    }

    setIsDeleting(true);
    try {
      const imageIDs = Array.from(selectedImageIDs);
      console.log('Deleting image IDs:', imageIDs);
      const response = await apiClient.post('/images/batch/delete', { imageIDs });
      
      const data = response.data as any;
      console.log('Delete response:', data);
      if (data.success > 0) {
        success(`成功删除 ${data.success} 张图片！`);
        setSelectedImageIDs(new Set());
        setShowDeleteConfirm(false);
        // 重新获取图片列表
        fetchImages(searchTags, searchMonth, searchCamera);
      }
      if (data.failed > 0) {
        showError(`有 ${data.failed} 张图片删除失败`);
      }
    } catch (error: any) {
      console.error('Batch delete failed:', error);
      console.error('Error response:', error.response?.data);
      const errorMessage = error.response?.data?.error || error.response?.data?.message || '批量删除失败，请稍后重试';
      showError(errorMessage);
    } finally {
      setIsDeleting(false);
    }
  };

  // 清空筛选
  const handleClearFilters = () => {
    setSearchTags('');
    setSearchMonth('');
    setSearchCamera('');
    fetchImages();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) {
      setSelectedFiles(null);
      return;
    }

    // 验证所有文件是否为真正的图片
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isValid = await isValidImageFile(file);
      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      showError(`以下文件不是有效的图片文件，已跳过: ${invalidFiles.join(', ')}`);
    }

    if (validFiles.length > 0) {
      // 创建新的 FileList
      const dataTransfer = new DataTransfer();
      validFiles.forEach(file => dataTransfer.items.add(file));
      setSelectedFiles(dataTransfer.files);
    } else {
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      showError('请先选择要上传的图片');
      return;
    }
    
    // 再次验证所有文件（双重验证确保安全）
    const validFiles: File[] = [];
    const invalidFiles: string[] = [];

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      const isValid = await isValidImageFile(file);
      if (isValid) {
        validFiles.push(file);
      } else {
        invalidFiles.push(file.name);
      }
    }

    if (invalidFiles.length > 0) {
      showError(`以下文件不是有效的图片文件，无法上传: ${invalidFiles.join(', ')}`);
      if (validFiles.length === 0) {
        return;
      }
    }
    
    const formData = new FormData();
    validFiles.forEach(file => {
      formData.append('images', file);
    });
    // 添加自动分析选项
    formData.append('autoAnalyze', autoAnalyze ? 'true' : 'false');
    
    setUploading(true);
    try {
      await apiClient.post('/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      success(`成功上传 ${validFiles.length} 张图片！`);
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // 上传后重新获取图片，保持当前的搜索筛选状态
      setSelectedImageIDs(new Set()); // 清空选择
      fetchImages(searchTags, searchMonth, searchCamera);
    } catch (error: any) {
      console.error('Upload failed:', error);
      const errorMessage = error.response?.data?.error || '上传失败，请稍后重试';
      showError(errorMessage);
    } finally {
      setUploading(false);
    }
  };

  // 拖拽上传相关函数
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // 验证所有文件是否为真正的图片
      const validFiles: File[] = [];
      const invalidFiles: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const isValid = await isValidImageFile(file);
        if (isValid) {
          validFiles.push(file);
        } else {
          invalidFiles.push(file.name);
        }
      }

      if (invalidFiles.length > 0) {
        showError(`以下文件不是有效的图片文件，已跳过: ${invalidFiles.join(', ')}`);
      }

      if (validFiles.length > 0) {
        // 创建新的 DataTransfer 对象来设置文件
        const dataTransfer = new DataTransfer();
        validFiles.forEach(file => dataTransfer.items.add(file));
        setSelectedFiles(dataTransfer.files);
      }
    }
  };

  return (
    <>
      {toasts.map(toast => (
        <Toast
          key={toast.id}
          message={toast.message}
          type={toast.type}
          onClose={() => removeToast(toast.id)}
        />
      ))}
      
      <div className="space-y-4 sm:space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">我的图片</h1>
            <p className="mt-1 text-xs sm:text-sm text-gray-500 dark:text-gray-400">管理和浏览您的图片收藏</p>
          </div>
        </div>

        {/* 搜索方式切换 */}
        <div className="flex gap-1 sm:gap-2 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
          <button
            onClick={() => {
              setUseMCP(false);
              // 切换到传统搜索时，清空MCP查询结果，重新加载所有图片
              fetchImages();
            }}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              !useMCP
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            传统搜索
          </button>
          <button
            onClick={() => {
              setUseMCP(true);
              // 切换到MCP搜索时，清空传统搜索条件
              setSearchTags('');
              setSearchMonth('');
              setSearchCamera('');
            }}
            className={`px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors whitespace-nowrap ${
              useMCP
                ? 'text-purple-600 dark:text-purple-400 border-b-2 border-purple-600 dark:border-purple-400'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            <svg className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1 sm:mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
            AI 智能搜索
          </button>
        </div>

        {/* MCP查询区域 */}
        {useMCP && (
          <MCPQuery
            onQueryResult={(resultImages) => {
              setImages(resultImages);
            }}
          />
        )}

        {/* 搜索和筛选区域 */}
        {!useMCP && (
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">搜索和筛选</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                标签 (用逗号分隔)
              </label>
              <input
                type="text"
                placeholder="例如: 风景,旅行"
                value={searchTags}
                onChange={(e) => setSearchTags(e.target.value)}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                拍摄月份
              </label>
              <input
                type="month"
                value={searchMonth}
                onChange={(e) => setSearchMonth(e.target.value)}
                className="input w-full"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                相机制造商
              </label>
              <input
                type="text"
                placeholder="例如: Canon, Nikon"
                value={searchCamera}
                onChange={(e) => setSearchCamera(e.target.value)}
                className="input w-full"
              />
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <button 
              onClick={handleSearch}
              className="btn btn-primary flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              搜索
            </button>
            <button 
              onClick={handleClearFilters}
              className="btn btn-outline flex items-center justify-center gap-2 w-full sm:w-auto"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              清空筛选
            </button>
          </div>
        </div>
        )}

        {/* 上传区域 */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">上传图片</h2>
          </div>
          
          {/* 拖拽上传区域 */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging 
                ? 'border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/30' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p className="text-base font-medium text-gray-700 dark:text-gray-300">
                  {selectedFiles && selectedFiles.length > 0 
                    ? `已选择 ${selectedFiles.length} 个文件` 
                    : '拖拽图片到此处，或点击选择文件'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">支持 JPG, PNG, GIF 等格式</p>
              </div>
              
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-upload"
              />
              <label
                htmlFor="file-upload"
                className="btn btn-outline cursor-pointer"
              >
                选择文件
              </label>
            </div>
          </div>

          {selectedFiles && selectedFiles.length > 0 && (
            <div className="mt-4 space-y-3">
              {/* AI自动分析选项 */}
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="auto-analyze"
                  checked={autoAnalyze}
                  onChange={(e) => setAutoAnalyze(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label 
                  htmlFor="auto-analyze" 
                  className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer"
                >
                  上传后自动进行AI标签分析
                </label>
              </div>
              
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="btn btn-primary w-full md:w-auto flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    上传中...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                    </svg>
                    上传图片
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 图片画廊 */}
        <div className="card p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 mb-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100">图片画廊</h2>
              {!loading && images.length > 0 && (
                <>
                  <label className="flex items-center gap-2 cursor-pointer text-xs sm:text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedImageIDs.size === images.length && images.length > 0}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                    />
                    <span>全选</span>
                  </label>
                  {selectedImageIDs.size > 0 && (
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="btn btn-danger text-xs sm:text-sm flex items-center justify-center gap-2 w-full sm:w-auto"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      删除选中 ({selectedImageIDs.size})
                    </button>
                  )}
                </>
              )}
            </div>
            {!loading && (
              <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
                共 {images.length} 张图片
              </span>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <svg className="animate-spin h-10 w-10 text-blue-600 mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-500 dark:text-gray-400">加载中...</p>
            </div>
          ) : images && images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
              {images.map(image => (
                <div 
                  key={image.ID} 
                  className="group relative bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  {/* 复选框 */}
                  <div 
                    className="absolute top-2 left-2 z-10"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <label className="flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedImageIDs.has(image.ID)}
                        onChange={() => toggleImageSelection(image.ID)}
                        onClick={(e) => e.stopPropagation()}
                        className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                      />
                    </label>
                  </div>
                  
                  {/* 图片容器 */}
                  <div className="aspect-square overflow-hidden bg-gray-100 dark:bg-gray-700">
                    <img 
                      src={`${getImageURL(image.thumbnailPath)}?v=${image.ID}`} 
                      alt={image.filename} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* 图片信息 */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100 truncate mb-2">
                      {image.filename}
                    </h3>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mb-3">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {image.takenAt ? new Date(image.takenAt).toLocaleDateString('zh-CN') : '未知日期'}
                    </div>
                    
                    {/* 标签 */}
                    {image.Tags && image.Tags.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {image.Tags.slice(0, 3).map(tag => (
                          <span 
                            key={tag.ID}
                            className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {image.Tags.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-medium">
                            +{image.Tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 悬浮时的查看按钮 */}
                  <div 
                    className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100 pointer-events-none"
                  >
                    <button 
                      className="btn btn-primary shadow-lg transform scale-90 group-hover:scale-100 transition-transform pointer-events-auto"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedImage(image);
                      }}
                    >
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400 dark:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600 dark:text-gray-400 font-medium mb-2">还没有图片</p>
              <p className="text-sm text-gray-500 dark:text-gray-500">上传您的第一张图片开始吧！</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 批量删除确认对话框 */}
      {showDeleteConfirm && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 sm:p-6"
          onClick={() => setShowDeleteConfirm(false)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl p-4 sm:p-6 max-w-md w-full shadow-2xl mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 sm:mb-4">
              确认删除
            </h3>
            <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6">
              确定要删除选中的 {selectedImageIDs.size} 张图片吗？此操作无法撤销。
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 sm:justify-end">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn btn-outline w-full sm:w-auto order-2 sm:order-1"
                disabled={isDeleting}
              >
                取消
              </button>
              <button
                onClick={handleBatchDelete}
                className="btn btn-danger w-full sm:w-auto order-1 sm:order-2"
                disabled={isDeleting}
              >
                {isDeleting ? (
                  <>
                    <svg className="animate-spin h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    删除中...
                  </>
                ) : (
                  '确认删除'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 图片详情模态框 */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          images={images} // 传递所有图片用于轮播
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          // 更新图片后保持当前的搜索筛选状态
          onImageUpdate={() => {
            setSelectedImageIDs(new Set()); // 清空选择
            fetchImages(searchTags, searchMonth, searchCamera);
          }}
        />
      )}
    </>
  );
};

export default Dashboard;
