import React, { useState } from 'react';
import apiClient from '../api/client';
import { useToast } from '../hooks/useToast';

// MCP查询条件类型
interface QueryCondition {
  tags: string[];
  month: string;
  camera: string;
  keywords: string[];
  reasoning: string;
}

// MCP查询响应类型
interface MCPQueryResponse {
  images: any[];
  count: number;
  condition: QueryCondition;
  message: string;
}

interface MCPQueryProps {
  onQueryResult: (images: any[]) => void;
}

const MCPQuery: React.FC<MCPQueryProps> = ({ onQueryResult }) => {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastCondition, setLastCondition] = useState<QueryCondition | null>(null);
  const { success, error: showError } = useToast();

  const handleQuery = async () => {
    if (!query.trim()) {
      showError('请输入查询内容');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post<MCPQueryResponse>('/mcp/query', {
        query: query.trim(),
      });

      setLastCondition(response.data.condition);
      onQueryResult(response.data.images);
      
      if (response.data.count > 0) {
        success(`找到 ${response.data.count} 张图片`);
      } else {
        success('未找到匹配的图片');
      }
    } catch (error: any) {
      console.error('MCP query failed:', error);
      if (error.response?.status === 401) {
        showError('请先登录');
      } else if (error.response?.data?.error) {
        showError(error.response.data.error);
      } else {
        showError('查询失败，请稍后重试');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading) {
      handleQuery();
    }
  };

  return (
    <div className="card p-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/30 dark:to-blue-900/30 border-purple-200 dark:border-purple-700 transition-colors">
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-5 h-5 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">AI 智能搜索</h2>
        <span className="ml-auto px-2 py-1 bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
          MCP
        </span>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
        使用自然语言描述您想要查找的图片，AI 会自动理解并搜索
      </p>

      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <div className="flex-1 relative">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="例如：找一些风景照片、显示上个月拍的Canon相机照片、查找标签为'旅行'的图片..."
            className="input w-full pr-10 sm:pr-12 text-sm sm:text-base"
            disabled={loading}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 p-1"
            >
              <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
        <button
          onClick={handleQuery}
          disabled={loading || !query.trim()}
          className="btn btn-primary flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto text-sm sm:text-base py-2.5 sm:py-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              查询中...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              搜索
            </>
          )}
        </button>
      </div>

      {/* 示例查询建议 */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 w-full sm:w-auto">示例：</span>
        {[
          '找一些风景照片',
          '显示上个月的照片',
          'Canon相机拍摄的图片',
          '标签为旅行的照片',
        ].map((example, index) => (
          <button
            key={index}
            onClick={() => setQuery(example)}
            className="px-2.5 sm:px-3 py-1 text-xs bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full hover:border-purple-300 dark:hover:border-purple-500 hover:text-purple-600 dark:hover:text-purple-400 transition-colors whitespace-nowrap"
            disabled={loading}
          >
            {example}
          </button>
        ))}
      </div>

      {/* 显示解析的查询条件 */}
      {lastCondition && (
        <div className="mt-4 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
          <div className="flex items-center gap-2 mb-2">
            <svg className="w-4 h-4 text-gray-500 dark:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">AI 解析结果</span>
          </div>
          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-300">
            {lastCondition.tags.length > 0 && (
              <div>
                <span className="font-medium">标签：</span>
                <span className="ml-2">{lastCondition.tags.join('、')}</span>
              </div>
            )}
            {lastCondition.month && (
              <div>
                <span className="font-medium">月份：</span>
                <span className="ml-2">{lastCondition.month}</span>
              </div>
            )}
            {lastCondition.camera && (
              <div>
                <span className="font-medium">相机：</span>
                <span className="ml-2">{lastCondition.camera}</span>
              </div>
            )}
            {lastCondition.keywords.length > 0 && (
              <div>
                <span className="font-medium">关键词：</span>
                <span className="ml-2">{lastCondition.keywords.join('、')}</span>
              </div>
            )}
            {lastCondition.reasoning && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <span className="font-medium">理解：</span>
                <span className="ml-2 text-gray-500 dark:text-gray-400">{lastCondition.reasoning}</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default MCPQuery;

