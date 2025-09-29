import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

// 定义图片数据类型
interface Image {
  ID: number;
  filename: string;
  filePath: string;
  thumbnailPath: string;
}

const Dashboard: React.FC = () => {
  const [images, setImages] = useState<Image[]>([]);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);
  const [message, setMessage] = useState('');

  // 获取图片列表的函数
  const fetchImages = async () => {
    try {
      const response = await apiClient.get('/images');
      setImages(response.data.data);
    } catch (error) {
      console.error('Failed to fetch images:', error);
      setMessage('Failed to load images.');
    }
  };

  // 使用 useEffect 在组件加载时获取一次图片列表
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
        {images.length > 0 ? (
          images.map(image => (
            <img 
              key={image.ID} 
              // 拼接图片的访问 URL
              src={`http://localhost:8080/${image.thumbnailPath}`} 
              alt={image.filename} 
              style={{ width: '200px', height: 'auto', border: '1px solid #ccc' }}
            />
          ))
        ) : (
          <p>You haven't uploaded any images yet.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;