import React, { useState } from 'react';
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

  const handleAddTag = async () => {
    if (!newTagName.trim() || isAdding) return;
    setIsAdding(true);
    try {
      await apiClient.post(`/images/${imageID}/tags`, { name: newTagName.trim() });
      setNewTagName('');
      onTagsUpdated(); // 通知父组件去刷新
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('Failed to add tag.');
    } finally {
      setIsAdding(false);
    }
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
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '15px' }}>
        {tags.map(tag => (
          <span key={tag.ID} style={{ background: '#007bff', color: 'white', padding: '5px 10px', borderRadius: '15px', fontSize: '12px', display: 'flex', alignItems: 'center' }}>
            {tag.name}
            <button onClick={() => handleRemoveTag(tag.ID)} style={{ background: 'none', border: 'none', color: 'white', marginLeft: '5px', cursor: 'pointer', fontWeight: 'bold' }}>×</button>
          </span>
        ))}
      </div>
      <div style={{ display: 'flex' }}>
        <input 
          type="text" 
          value={newTagName} 
          onChange={(e) => setNewTagName(e.target.value)}
          placeholder="添加新标签..."
          style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
        />
        <button onClick={handleAddTag} disabled={isAdding} style={{ marginLeft: '10px', padding: '8px 15px' }}>
          {isAdding ? '添加中...' : '添加'}
        </button>
      </div>
    </div>
  );
};

export default TagManager;