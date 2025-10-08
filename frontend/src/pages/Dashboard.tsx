import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';
import EXIFInfo from '../components/EXIFInfo';
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

  // 获取图片列表的函数
  const fetchImages = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get<{ images: Image[] }>('/images');
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
          // 【修复】在这里添加 onImageUpdate prop，并把 fetchImages 函数传给它
          onImageUpdate={fetchImages}
        />
      )}
    </div>
  );
};

export default Dashboard;