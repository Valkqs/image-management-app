import React, { useState, useEffect } from 'react';
import apiClient from '../api/client.js';
import EXIFInfo from '../components/EXIFInfo.js';
import ImageModal from '../components/ImageModal.js';

// 定义图片数据类型
interface Image {
  ID: number;
  CreatedAt: string;
  UpdatedAt: string;
  DeletedAt?: string;
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
}

const Dashboard: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEXIF, setShowEXIF] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 获取图片列表的函数
  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/images');
      console.log('API Response:', response.data); // 调试日志
      setImages(response.data.images || []); // 使用正确的字段名，并提供默认值
    } catch (error: any) {
      console.error('Failed to fetch images:', error);
      if (error.response?.status === 401) {
        setMessage('Please login first.');
        // 可以在这里重定向到登录页面
      } else {
        setMessage('Failed to load images.');
      }
      setImages([]); // 确保在错误时设置空数组
    } finally {
      setLoading(false);
    }
  };

  // 使用 useEffect 在组件加载时获取一次图片列表
  useEffect(() => {
    fetchImages();
  }, []);

  // 切换EXIF信息显示
  const toggleEXIF = (imageId: number) => {
    setShowEXIF(showEXIF === imageId ? null : imageId);
  };

  // 打开图片详情模态框
  const openImageModal = (image: Image) => {
    setSelectedImage(image);
    setIsModalOpen(true);
  };

  // 关闭图片详情模态框
  const closeImageModal = () => {
    setIsModalOpen(false);
    setSelectedImage(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(e.target.files);
  };

  const handleUpload = async () => {
    if (!selectedFiles) {
      alert('Please select files to upload.');
      return;
    }

    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }

    try {
      // 发送上传请求，注意要覆盖 header
      const response = await apiClient.post('/images', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setMessage(response.data.message);
      // 上传成功后，重新获取图片列表以刷新页面
      fetchImages();
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Upload failed.');
    }
  };

  return (
    <div>
      <h2>My Image Dashboard</h2>
      
      <div>
        <h3>Upload New Images</h3>
        <input type="file" multiple onChange={handleFileChange} />
        <button onClick={handleUpload}>Upload</button>
        {message && <p>{message}</p>}
      </div>

      <hr />

      <h3>My Gallery</h3>
      {loading ? (
        <p>Loading images...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
          {images && images.length > 0 ? (
            images.map(image => (
              <div key={image.ID} style={{ 
                border: '1px solid #ddd', 
                borderRadius: '8px', 
                overflow: 'hidden',
                backgroundColor: 'white',
                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                {/* 图片部分 */}
                <div style={{ position: 'relative' }}>
                  <img 
                    src={`http://localhost:8080/${image.thumbnailPath}`} 
                    alt={image.filename} 
                    style={{ 
                      width: '100%', 
                      height: '200px', 
                      objectFit: 'cover',
                      cursor: 'pointer'
                    }}
                    onClick={() => window.open(`http://localhost:8080/${image.filePath}`, '_blank')}
                  />
                  <div style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    backgroundColor: 'rgba(0,0,0,0.7)',
                    color: 'white',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '12px'
                  }}>
                    {image.filename}
                  </div>
                </div>
                
                {/* 操作按钮 */}
                <div style={{ padding: '10px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                    <button 
                      onClick={() => openImageModal(image)}
                      style={{
                        backgroundColor: '#28a745',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        flex: '1'
                      }}
                    >
                      📋 详情
                    </button>
                    <button 
                      onClick={() => toggleEXIF(image.ID)}
                      style={{
                        backgroundColor: showEXIF === image.ID ? '#dc3545' : '#007bff',
                        color: 'white',
                        border: 'none',
                        padding: '8px 12px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontSize: '12px',
                        flex: '1'
                      }}
                    >
                      {showEXIF === image.ID ? '隐藏 EXIF' : '显示 EXIF'}
                    </button>
                  </div>
                  
                  {/* EXIF信息显示 */}
                  {showEXIF === image.ID && (
                    <EXIFInfo image={image} />
                  )}
                </div>
              </div>
            ))
          ) : (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '40px' }}>
              <p style={{ fontSize: '18px', color: '#666' }}>You haven't uploaded any images yet.</p>
            </div>
          )}
        </div>
      )}
      
      {/* 图片详情模态框 */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          isOpen={isModalOpen}
          onClose={closeImageModal}
        />
      )}
    </div>
  );
};

export default Dashboard;