import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import ImageModal from '../components/ImageModal';

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
  Tags: Tag[]; // 确保 Tags 属性存在
}

// 定义 Tag 类型
interface Tag {
  ID: number;
  name: string;
}

const Dashboard: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<Image | null>(null);

  // 搜索和筛选状态
  const [searchTags, setSearchTags] = useState('');
  const [searchMonth, setSearchMonth] = useState('');
  const [searchCamera, setSearchCamera] = useState('');

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
        setMessage('Please login first.');
      } else {
        setMessage('Failed to load images.');
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
    if (!selectedFiles) {
      alert('Please select files to upload.');
      return;
    }
    const formData = new FormData();
    for (let i = 0; i < selectedFiles.length; i++) {
      formData.append('images', selectedFiles[i]);
    }
    try {
      const response = await apiClient.post('/images', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setMessage(response.data.message);
      // 上传后重新获取图片，保持当前的搜索筛选状态
      fetchImages(searchTags, searchMonth, searchCamera);
    } catch (error) {
      console.error('Upload failed:', error);
      setMessage('Upload failed.');
    }
  };

  return (
    <div>
      <h2>My Image Dashboard</h2>
      
      {/* 搜索和筛选区域 */}
      <div style={{ 
        background: '#f8f9fa', 
        padding: '20px', 
        borderRadius: '8px', 
        marginBottom: '20px',
        border: '1px solid #dee2e6'
      }}>
        <h3 style={{ marginTop: 0 }}>搜索和筛选</h3>
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '15px',
          marginBottom: '15px'
        }}>
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              标签 (用逗号分隔):
            </label>
            <input
              type="text"
              placeholder="例如: 风景,旅行"
              value={searchTags}
              onChange={(e) => setSearchTags(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              拍摄月份:
            </label>
            <input
              type="month"
              value={searchMonth}
              onChange={(e) => setSearchMonth(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '14px'
              }}
            />
          </div>
          
          <div>
            <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
              相机制造商:
            </label>
            <input
              type="text"
              placeholder="例如: Canon, Nikon"
              value={searchCamera}
              onChange={(e) => setSearchCamera(e.target.value)}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '4px',
                border: '1px solid #ced4da',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={handleSearch}
            style={{
              padding: '10px 20px',
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            🔍 搜索
          </button>
          <button 
            onClick={handleClearFilters}
            style={{
              padding: '10px 20px',
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: '500',
              fontSize: '14px'
            }}
          >
            🔄 清空筛选
          </button>
        </div>
      </div>
      
      <div>
        <h3>Upload New Images</h3>
        <input type="file" multiple onChange={handleFileChange} />
        <button onClick={handleUpload}>Upload</button>
        {message && <p>{message}</p>}
      </div>

      <hr />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
        <h3 style={{ margin: 0 }}>My Gallery</h3>
        {!loading && (
          <span style={{ color: '#6c757d', fontSize: '14px' }}>
            找到 {images.length} 张图片
          </span>
        )}
      </div>
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
                <img 
                  src={`http://localhost:8080/${image.thumbnailPath}`} 
                  alt={image.filename} 
                  style={{ width: '100%', height: '200px', objectFit: 'cover', cursor: 'pointer' }}
                  onClick={() => setSelectedImage(image)} // 点击图片打开模态框
                />
                <div style={{ padding: '15px', color: '#333' }}>
                    <p style={{ margin: 0, fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {image.filename}
                    </p>
                    <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#666' }}>
                        拍摄于: {image.takenAt ? new Date(image.takenAt).toLocaleDateString() : '未知'}
                    </p>
                    <div style={{ marginTop: '10px', display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                      {(image.Tags || []).map(tag => (
                        <span key={tag.ID} style={{
                          background: '#e9ecef',
                          color: '#495057',
                          padding: '2px 8px',
                          borderRadius: '10px',
                          fontSize: '11px'
                        }}>
                          {tag.name}
                        </span>
                      ))}
                    </div>
                </div>
              </div>
            ))
          ) : (
            <p>You haven't uploaded any images yet.</p>
          )}
        </div>
      )}
      
      {/* 图片详情模态框 */}
      {selectedImage && (
        <ImageModal
          image={selectedImage}
          isOpen={!!selectedImage}
          onClose={() => setSelectedImage(null)}
          // 更新图片后保持当前的搜索筛选状态
          onImageUpdate={() => fetchImages(searchTags, searchMonth, searchCamera)}
        />
      )}
    </div>
  );
};

export default Dashboard;