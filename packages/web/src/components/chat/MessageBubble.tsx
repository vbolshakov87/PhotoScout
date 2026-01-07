import type { Message } from '@photoscout/shared';
import { HtmlPreview } from '../shared/HtmlPreview';
import { useNativeBridge } from '../../hooks/useNativeBridge';
import { Share2, Copy } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { share, copyToClipboard, haptic } = useNativeBridge();
  const isUser = message.role === 'user';

  // Check for HTML content (<!DOCTYPE html> or <html tag anywhere in the content)
  const hasHtmlStart = message.content.includes('<!DOCTYPE html>') || message.content.includes('<html');
  const hasHtmlEnd = message.content.includes('</html>');

  // Only treat as complete HTML if it has both start and end tags
  const isCompleteHtml = hasHtmlStart && hasHtmlEnd;
  const isIncompleteHtml = hasHtmlStart && !hasHtmlEnd;

  // Check if content contains markdown syntax (for assistant messages only)
  const isMarkdown = !isUser && !hasHtmlStart && (
    message.content.includes('**') ||
    message.content.includes('\n- ') ||
    message.content.includes('\n1. ') ||
    message.content.includes('\n2. ')
  );

  const handleShare = () => {
    haptic('light');
    share(message.content, 'PhotoScout Trip Plan');
  };

  const handleCopy = () => {
    haptic('light');
    copyToClipboard(message.content);
  };

  // Show "Generating..." for incomplete HTML
  if (isIncompleteHtml) {
    return (
      <div className="flex justify-start">
        <div className="max-w-[85%] px-4 py-3 rounded-2xl bg-card text-foreground rounded-bl-md">
          <div className="flex items-center gap-2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full"></div>
            <span>Generating interactive HTML plan...</span>
          </div>
        </div>
      </div>
    );
  }

  // Show complete HTML with preview and actions
  if (isCompleteHtml) {
    return (
      <div className="space-y-2">
        <HtmlPreview html={message.content} />
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-card rounded-full hover:bg-white/10 transition-colors"
          >
            <Copy className="w-3 h-3" />
            Copy HTML
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-1 px-3 py-1.5 text-xs bg-primary rounded-full hover:bg-primary/80 transition-colors"
          >
            <Share2 className="w-3 h-3" />
            Share
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-4 py-2 rounded-2xl ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-card text-foreground rounded-bl-md'
        }`}
      >
        {isMarkdown ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Customize styling to match the dark theme
                strong: ({ node, ...props }) => <strong className="font-bold text-white" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc list-inside space-y-1 my-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal list-inside space-y-1 my-2" {...props} />,
                li: ({ node, ...props }) => <li className="ml-2" {...props} />,
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                h1: ({ node, ...props }) => <h1 className="text-xl font-bold mb-2" {...props} />,
                h2: ({ node, ...props }) => <h2 className="text-lg font-bold mb-2" {...props} />,
                h3: ({ node, ...props }) => <h3 className="text-base font-bold mb-1" {...props} />,
                code: ({ node, ...props }) => <code className="bg-black/30 px-1 rounded text-sm" {...props} />,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap">{message.content}</p>
        )}
      </div>
    </div>
  );
}
