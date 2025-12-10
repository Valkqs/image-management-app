import React, { useState, useEffect, useRef } from 'react';
import apiClient from '../api/client';
import ImageModal from '../components/ImageModal';
import Toast from '../components/Toast';
import { useToast } from '../hooks/useToast';

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

  // 搜索和筛选状态
  const [searchTags, setSearchTags] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [searchCamera, setSearchCamera] = useState('');

  const { toasts, removeToast, success, error: showError } = useToast();

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
    fetchImages(searchTags, searchMonth, searchCamera);
  };

  // 清空筛选
  const handleClearFilters = () => {
    setSearchTags('');
    setSearchMonth('');
    setSearchCamera('');
    fetchImages();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles || selectedFiles.length === 0) {
      showError('请先选择要上传的图片');
      return;
    }
    
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }
    
    setUploading(true);
    try {
      await apiClient.post('/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      success(`成功上传 ${selectedFiles.length} 张图片！`);
      setSelectedFiles(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      // 上传后重新获取图片，保持当前的搜索筛选状态
      fetchImages(searchTags, searchMonth, searchCamera);
    } catch (error) {
      console.error('Upload failed:', error);
      showError('上传失败，请稍后重试');
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

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // 创建新的 DataTransfer 对象来设置文件
      const dataTransfer = new DataTransfer();
      Array.from(files).forEach(file => {
        if (file.type.startsWith('image/')) {
          dataTransfer.items.add(file);
        }
      });
      setSelectedFiles(dataTransfer.files);
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
      
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">我的图片</h1>
            <p className="mt-1 text-sm text-gray-500">管理和浏览您的图片收藏</p>
          </div>
        </div>

        {/* 搜索和筛选区域 */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">搜索和筛选</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <label className="block text-sm font-medium text-gray-700 mb-2">
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
          
          <div className="flex gap-3">
            <button 
              onClick={handleSearch}
              className="btn btn-primary flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              搜索
            </button>
            <button 
              onClick={handleClearFilters}
              className="btn btn-outline flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              清空筛选
            </button>
          </div>
        </div>

        {/* 上传区域 */}
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2 className="text-lg font-semibold text-gray-900">上传图片</h2>
          </div>
          
          {/* 拖拽上传区域 */}
          <div
            onDragEnter={handleDragEnter}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-8 text-center transition-all ${
              isDragging 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
          >
            <div className="flex flex-col items-center gap-3">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p className="text-base font-medium text-gray-700">
                  {selectedFiles && selectedFiles.length > 0 
                    ? `已选择 ${selectedFiles.length} 个文件` 
                    : '拖拽图片到此处，或点击选择文件'}
                </p>
                <p className="text-sm text-gray-500 mt-1">支持 JPG, PNG, GIF 等格式</p>
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
            <div className="mt-4">
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
        <div className="card p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">图片画廊</h2>
            {!loading && (
              <span className="text-sm text-gray-500">
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
              <p className="text-gray-500">加载中...</p>
            </div>
          ) : images && images.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {images.map(image => (
                <div 
                  key={image.ID} 
                  className="group relative bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer"
                  onClick={() => setSelectedImage(image)}
                >
                  {/* 图片容器 */}
                  <div className="aspect-square overflow-hidden bg-gray-100">
                    <img 
                      src={`http://localhost:8080/${image.thumbnailPath}?v=${image.ID}`} 
                      alt={image.filename} 
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                    />
                  </div>

                  {/* 图片信息 */}
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 truncate mb-2">
                      {image.filename}
                    </h3>
                    
                    <div className="flex items-center gap-1 text-xs text-gray-500 mb-3">
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
                            className="inline-flex items-center px-2 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-medium"
                          >
                            {tag.name}
                          </span>
                        ))}
                        {image.Tags.length > 3 && (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-600 text-xs font-medium">
                            +{image.Tags.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 悬浮时的查看按钮 */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                    <button className="btn btn-primary shadow-lg transform scale-90 group-hover:scale-100 transition-transform">
                      查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <p className="text-gray-600 font-medium mb-2">还没有图片</p>
              <p className="text-sm text-gray-500">上传您的第一张图片开始吧！</p>
            </div>
          )}
        </div>
      </div>
      
      {/* 图片详情模态框 */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          images={images} // 传递所有图片用于轮播
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          // 更新图片后保持当前的搜索筛选状态
          onImageUpdate={() => fetchImages(searchTags, searchMonth, searchCamera)}
        />
      )}
    </>
  );
};

export default Dashboard;
