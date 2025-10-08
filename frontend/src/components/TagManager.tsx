import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface Tag {
  ID: number;
  name: string;
}

interface TagManagerProps {
  imageID: number;
  tags: Tag[]; // 直接接收 tags
  onTagsUpdated: () => void; // 通知父组件刷新
}

const TagManager: React.FC<TagManagerProps> = ({ imageID, tags = [], onTagsUpdated }) => {
  const [newTagName, setNewTagName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]); // 所有可用的标签
  const [showSuggestions, setShowSuggestions] = useState(false); // 是否显示建议标签

  // 获取所有使用中的标签
  useEffect(() => {
    const fetchAvailableTags = async () => {
      try {
        const response = await apiClient.get<{ tags: Tag[] }>('/tags');
        setAvailableTags(response.data.tags || []);
      } catch (error) {
        console.error('Failed to fetch available tags:', error);
      }
    };
    fetchAvailableTags();
  }, [tags]); // 当当前图片的标签改变时，重新获取可用标签

  // 过滤出还未添加到当前图片的标签
  const suggestedTags = availableTags.filter(
    availableTag => !tags.some(tag => tag.ID === availableTag.ID)
  );

  const handleAddTag = async (tagName?: string) => {
    const nameToAdd = tagName || newTagName.trim();
    if (!nameToAdd || isAdding) return;
    setIsAdding(true);
    try {
      await apiClient.post(`/images/${imageID}/tags`, { name: nameToAdd });
      setNewTagName('');
      setShowSuggestions(false);
      onTagsUpdated(); // 通知父组件去刷新
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('Failed to add tag.');
    } finally {
      setIsAdding(false);
    }
  };

  // 快速添加已存在的标签
  const handleQuickAddTag = async (tag: Tag) => {
    await handleAddTag(tag.name);
  };

  const handleRemoveTag = async (tagID: number) => {
    try {
      await apiClient.delete(`/images/${imageID}/tags/${tagID}`);
      onTagsUpdated(); // 通知父组件去刷新
    } catch (error) {
      console.error('Failed to remove tag:', error);
      alert('Failed to remove tag.');
    }
  };

  return (
    <div>
      <h4 style={{ margin: '0 0 10px 0', color: '#666' }}>标签</h4>
      
      {/* 当前图片已有的标签 */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
        {tags.length > 0 ? (
          tags.map(tag => (
            <span key={tag.ID} style={{ background: '#007bff', color: 'white', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
              {tag.name}
              <button onClick={() => handleRemoveTag(tag.ID)} style={{ background: 'none', border: 'none', color: 'white', marginLeft: '5px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
            </span>
          ))
        ) : (
          <span style={{ color: '#999', fontSize: '12px' }}>暂无标签</span>
        )}
      </div>

      {/* 添加标签输入框 */}
      <div style={{ display: 'flex', marginBottom: '10px' }}>
        <input 
          type="text" 
          value={newTagName} 
          onChange={(e) => setNewTagName(e.target.value)}
          onFocus={() => setShowSuggestions(true)}
          placeholder="添加新标签或输入标签名..."
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
        />
        <button onClick={() => handleAddTag()} disabled={isAdding} style={{ marginLeft: '10px', padding: '8px 15px' }}>
          {isAdding ? '添加中...' : '添加'}
        </button>
      </div>

      {/* 显示可用的建议标签 */}
      {showSuggestions && suggestedTags.length > 0 && (
        <div style={{ 
          marginTop: '10px', 
          padding: '10px', 
          background: '#f8f9fa', 
          borderRadius: '8px',
          border: '1px solid #dee2e6'
        }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#6c757d', 
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>点击快速添加:</span>
            <button 
              onClick={() => setShowSuggestions(false)} 
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#6c757d', 
                cursor: 'pointer',
                fontSize: '16px',
                padding: '0 5px'
              }}
            >
              ×
            </button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {suggestedTags.map(tag => (
              <button
                key={tag.ID}
                onClick={() => handleQuickAddTag(tag)}
                disabled={isAdding}
                style={{
                  background: 'white',
                  color: '#495057',
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '12px',
                  border: '1px solid #ced4da',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#007bff';
                  e.currentTarget.style.color = 'white';
                  e.currentTarget.style.borderColor = '#007bff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'white';
                  e.currentTarget.style.color = '#495057';
                  e.currentTarget.style.borderColor = '#ced4da';
                }}
              >
                + {tag.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagManager;