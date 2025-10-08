import React, { useState, useEffect } from 'react';
import apiClient from '../api/client';

interface Tag {
  ID: number;
  name: string;
}

interface TagManagerProps {
  imageID: number;
  tags: Tag[];
  onTagsUpdated: () => void;
}

const TagManager: React.FC<TagManagerProps> = ({ imageID, tags = [], onTagsUpdated }) => {
  const [newTagName, setNewTagName] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [availableTags, setAvailableTags] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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
  }, [tags]);

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
      onTagsUpdated();
    } catch (error) {
      console.error('Failed to add tag:', error);
      alert('添加标签失败');
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
      onTagsUpdated();
    } catch (error) {
      console.error('Failed to remove tag:', error);
      alert('删除标签失败');
    }
  };

  return (
    <div>
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
        标签
      </h3>
      
      {/* 当前图片已有的标签 */}
      <div className="flex flex-wrap gap-2 mb-4">
        {tags.length > 0 ? (
          tags.map(tag => (
            <span 
              key={tag.ID}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white rounded-full text-sm font-medium group hover:bg-blue-700 transition-colors"
            >
              {tag.name}
              <button
                onClick={() => handleRemoveTag(tag.ID)}
                className="ml-1 hover:bg-blue-800 rounded-full p-0.5 transition-colors"
                title="删除标签"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))
        ) : (
          <span className="text-sm text-gray-500 italic">暂无标签</span>
        )}
      </div>

      {/* 添加标签输入框 */}
      <div className="space-y-3">
        <div className="flex gap-2">
          <input 
            type="text" 
            value={newTagName} 
            onChange={(e) => setNewTagName(e.target.value)}
            onFocus={() => setShowSuggestions(true)}
            placeholder="添加标签..."
            className="input flex-1 text-sm"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddTag();
              }
            }}
          />
          <button 
            onClick={() => handleAddTag()} 
            disabled={isAdding || !newTagName.trim()}
            className="btn btn-primary px-4 text-sm disabled:opacity-50"
          >
            {isAdding ? (
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              '添加'
            )}
          </button>
        </div>

        {/* 显示可用的建议标签 */}
        {showSuggestions && suggestedTags.length > 0 && (
          <div className="relative">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 animate-fade-in">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-medium text-gray-600">快速添加</span>
                <button 
                  onClick={() => setShowSuggestions(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {suggestedTags.slice(0, 10).map(tag => (
                  <button
                    key={tag.ID}
                    onClick={() => handleQuickAddTag(tag)}
                    disabled={isAdding}
                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white border border-gray-300 rounded-md text-xs font-medium text-gray-700 hover:bg-gray-100 hover:border-gray-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {tag.name}
                  </button>
                ))}
              </div>
              {suggestedTags.length > 10 && (
                <p className="text-xs text-gray-500 mt-2">还有 {suggestedTags.length - 10} 个标签...</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TagManager;
