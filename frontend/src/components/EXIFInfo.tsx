import React from 'react';

interface EXIFInfoProps {
  image: {
    cameraMake?: string;
    cameraModel?: string;
    resolution?: string;
    takenAt?: string;
    latitude?: number;
    longitude?: number;
    filename: string;
  };
}

const EXIFInfo: React.FC<EXIFInfoProps> = ({ image }) => {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleString();
    } catch {
      return dateString;
    }
  };

  const formatCoordinates = (lat?: number, lng?: number) => {
    if (!lat || !lng) return 'N/A';
    return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
  };

  const getGoogleMapsLink = (lat?: number, lng?: number) => {
    if (!lat || !lng) return undefined;
    return `https://www.google.com/maps?q=${lat},${lng}`;
  };

  return (
    <div style={{ 
      padding: '10px', 
      backgroundColor: '#f5f5f5', 
      borderRadius: '8px', 
      marginTop: '10px',
      fontSize: '14px',
      lineHeight: '1.4'
    }}>
      <h4 style={{ margin: '0 0 10px 0', color: '#333' }}>EXIF 信息</h4>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
        <div>
          <strong>文件名:</strong> {image.filename}
        </div>
        
        <div>
          <strong>拍摄时间:</strong> {formatDate(image.takenAt)}
        </div>
        
        <div>
          <strong>相机制造商:</strong> {image.cameraMake || 'N/A'}
        </div>
        
        <div>
          <strong>相机型号:</strong> {image.cameraModel || 'N/A'}
        </div>
        
        <div>
          <strong>分辨率:</strong> {image.resolution || 'N/A'}
        </div>
        
        <div>
          <strong>GPS坐标:</strong> {formatCoordinates(image.latitude, image.longitude)}
        </div>
      </div>
      
      {image.latitude && image.longitude && (
        <div style={{ marginTop: '10px' }}>
          <a 
            href={getGoogleMapsLink(image.latitude, image.longitude)} 
            target="_blank" 
            rel="noopener noreferrer"
            style={{ 
              color: '#007bff', 
              textDecoration: 'none',
              fontSize: '12px'
            }}
          >
            📍 在Google地图中查看位置
          </a>
        </div>
      )}
    </div>
  );
};

export default EXIFInfo;
