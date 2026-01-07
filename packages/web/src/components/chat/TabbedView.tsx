import { useState, useEffect } from 'react';
import { MessageSquare, FileText } from 'lucide-react';
import type { Message } from '@photoscout/shared';

interface TabbedViewProps {
  chatContent: React.ReactNode;
  previewContent: React.ReactNode;
  messages: Message[];
}

export function TabbedView({ chatContent, previewContent, messages }: TabbedViewProps) {
  const [activeTab, setActiveTab] = useState<'chat' | 'preview'>('chat');
  const [hasNewHtml, setHasNewHtml] = useState(false);

  // Check if there's any complete HTML in messages
  const hasCompleteHtml = messages.some(
    (msg) => msg.content.includes('<!DOCTYPE html>') && msg.content.includes('</html>')
  );

  // Load saved tab from localStorage
  useEffect(() => {
    const savedTab = localStorage.getItem('photoscout-active-tab');
    if (savedTab === 'preview' && hasCompleteHtml) {
      setActiveTab('preview');
    }
  }, [hasCompleteHtml]);

  // Detect new HTML generation and show badge
  useEffect(() => {
    if (hasCompleteHtml && activeTab === 'chat') {
      setHasNewHtml(true);
    }
  }, [messages, hasCompleteHtml, activeTab]);

  // Save active tab to localStorage
  const handleTabChange = (tab: 'chat' | 'preview') => {
    setActiveTab(tab);
    setHasNewHtml(false); // Clear badge when switching to preview
    localStorage.setItem('photoscout-active-tab', tab);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' ? chatContent : previewContent}
      </div>

      {/* Tab Bar - Only show if HTML is available */}
      {hasCompleteHtml && (
        <div className="border-t border-white/10 bg-background">
          <div className="flex items-center justify-around max-w-md mx-auto">
            <button
              onClick={() => handleTabChange('chat')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors relative ${
                activeTab === 'chat'
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm font-medium">Chat</span>
            </button>

            <button
              onClick={() => handleTabChange('preview')}
              className={`flex-1 flex items-center justify-center gap-2 py-3 transition-colors relative ${
                activeTab === 'preview'
                  ? 'text-primary border-t-2 border-primary'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm font-medium">Preview</span>
              {hasNewHtml && (
                <span className="absolute top-2 right-1/4 w-2 h-2 bg-red-500 rounded-full animate-pulse"></span>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
