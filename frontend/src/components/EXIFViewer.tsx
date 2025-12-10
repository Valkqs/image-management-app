import React, { useState } from 'react';

interface EXIFViewerProps {
  image: {
    filename: string;
    cameraMake?: string;
    cameraModel?: string;
    resolution?: string;
    takenAt?: string;
    latitude?: number;
    longitude?: number;
  };
}

const EXIFViewer: React.FC<EXIFViewerProps> = ({ image }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const exifData = [
    { label: '文件名', value: image.filename, icon: '📁' },
    { label: '相机制造商', value: image.cameraMake || 'N/A', icon: '📷' },
    { label: '相机型号', value: image.cameraModel || 'N/A', icon: '📸' },
    { label: '分辨率', value: image.resolution || 'N/A', icon: '📐' },
    { label: '拍摄时间', value: image.takenAt ? new Date(image.takenAt).toLocaleString('zh-CN') : 'N/A', icon: '🕐' },
    { label: 'GPS 纬度', value: image.latitude ? image.latitude.toFixed(6) : 'N/A', icon: '🌐' },
    { label: 'GPS 经度', value: image.longitude ? image.longitude.toFixed(6) : 'N/A', icon: '🌍' },
  ];

  // 过滤出有值的 EXIF 数据
  const availableData = exifData.filter(item => item.value !== 'N/A');

  return (
    <div className="space-y-3">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center justify-between w-full text-left group"
      >
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          完整 EXIF 信息
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
            {availableData.length} 项
          </span>
        </h3>
        <svg 
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isExpanded && (
        <div className="animate-fade-in">
          <div className="bg-gray-50 rounded-lg p-4 space-y-3 border border-gray-200">
            {availableData.map((item, index) => (
              <div 
                key={index}
                className="flex items-start gap-3 pb-3 border-b border-gray-200 last:border-0 last:pb-0"
              >
                <span className="text-2xl flex-shrink-0">{item.icon}</span>
                <div className="flex-1 min-w-0">
                  <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    {item.label}
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono break-words">
                    {item.value}
                  </dd>
                </div>
              </div>
            ))}

            {availableData.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-4">
                此图片没有可用的 EXIF 信息
              </p>
            )}
          </div>

          {/* GPS 信息快速操作 */}
          {image.latitude && image.longitude && (
            <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <a
                href={`https://www.google.com/maps?q=${image.latitude},${image.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 text-blue-700 hover:text-blue-800 font-medium text-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                在 Google 地图中查看位置
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          )}

          {/* 下载原始数据 */}
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => {
                const dataStr = JSON.stringify({
                  filename: image.filename,
                  cameraMake: image.cameraMake,
                  cameraModel: image.cameraModel,
                  resolution: image.resolution,
                  takenAt: image.takenAt,
                  gps: {
                    latitude: image.latitude,
                    longitude: image.longitude,
                  }
                }, null, 2);
                const blob = new Blob([dataStr], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${image.filename}-exif.json`;
                a.click();
                URL.revokeObjectURL(url);
              }}
              className="flex-1 btn btn-outline text-xs py-2 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              下载 JSON
            </button>
            <button
              onClick={() => {
                const text = availableData.map(item => `${item.label}: ${item.value}`).join('\n');
                navigator.clipboard.writeText(text);
                alert('已复制到剪贴板！');
              }}
              className="flex-1 btn btn-outline text-xs py-2 flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              复制文本
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EXIFViewer;

