import type { Message } from '@photoscout/shared';
import { HtmlPreview } from '../shared/HtmlPreview';
import { useNativeBridge } from '../../hooks/useNativeBridge';
import { Share2, Copy, Check, ArrowRight } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useState } from 'react';

interface QuickAction {
  label: string;
  value: string;
}

interface MessageBubbleProps {
  message: Message;
  onSend?: (message: string) => void;
  isLastMessage?: boolean;
}

export function MessageBubble({ message, onSend, isLastMessage }: MessageBubbleProps) {
  const { share, copyToClipboard, haptic } = useNativeBridge();
  const [copied, setCopied] = useState(false);
  const isUser = message.role === 'user';

  const hasHtmlStart = message.content.includes('<!DOCTYPE html>') || message.content.includes('<html');
  const hasHtmlEnd = message.content.includes('</html>');
  const isCompleteHtml = hasHtmlStart && hasHtmlEnd;

  // Check if this is the "plan ready" message asking for confirmation
  const isPlanReadyMessage = !isUser && isLastMessage && (
    message.content.includes('Does this plan look good') ||
    message.content.includes('generate the full interactive HTML')
  );

  // Detect question patterns for quick action buttons
  const contentLower = message.content.toLowerCase();
  const isDurationQuestion = !isUser && isLastMessage && (
    contentLower.includes('how many days') ||
    contentLower.includes('duration')
  );

  const isInterestsQuestion = !isUser && isLastMessage && (
    contentLower.includes('photography priorities') ||
    contentLower.includes('what are you most interested') ||
    contentLower.includes('what type of photography') ||
    contentLower.includes('main interests') ||
    contentLower.includes('top photography')
  );

  // Quick action options
  const durationOptions: QuickAction[] = [
    { label: '2 days', value: '2 days' },
    { label: '3 days', value: '3 days' },
    { label: '5 days', value: '5 days' },
    { label: '1 week', value: '7 days' },
  ];

  const interestOptions: QuickAction[] = [
    { label: 'Architecture', value: 'Architecture and urban landscapes' },
    { label: 'Street', value: 'Street photography' },
    { label: 'Landscapes', value: 'Landscapes and nature' },
    { label: 'Golden hour', value: 'Golden hour shots' },
  ];

  const handleQuickAction = (value: string) => {
    haptic('light');
    onSend?.(value);
  };

  const isMarkdown = !isUser && !isCompleteHtml && (
    message.content.includes('**') ||
    message.content.includes('\n- ') ||
    message.content.includes('\n1. ')
  );

  const handleCopy = () => {
    haptic('light');
    copyToClipboard(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleQuickReply = () => {
    haptic('light');
    onSend?.("Yes, let's go!");
  };

  if (isCompleteHtml) {
    return (
      <div className="space-y-3">
        <HtmlPreview html={message.content} />
        <div className="flex gap-2 justify-end">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-card border border-border rounded-lg text-muted hover:text-foreground transition-colors press"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-success" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
          <button
            onClick={() => { haptic('light'); share(message.content, 'PhotoScout Trip'); }}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-primary text-white rounded-lg press"
          >
            <Share2 className="w-3.5 h-3.5" />
            Share
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[85%] px-4 py-3 rounded-2xl ${
        isUser
          ? 'bg-primary text-white rounded-br-md'
          : 'bg-card border border-border rounded-bl-md'
      }`}>
        {isMarkdown ? (
          <div className="prose prose-invert prose-sm max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                li: ({ children }) => <li className="ml-1">{children}</li>,
                p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                h1: ({ children }) => <h1 className="text-lg font-semibold mb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-base font-semibold mb-2">{children}</h2>,
                h3: ({ children }) => <h3 className="text-sm font-semibold mb-1">{children}</h3>,
                code: ({ children }) => <code className="bg-black/20 px-1 rounded text-sm">{children}</code>,
              }}
            >
              {message.content}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-[15px]">{message.content}</p>
        )}
      </div>

      {/* Quick action buttons for duration question */}
      {isDurationQuestion && onSend && (
        <div className="mt-3 flex flex-wrap gap-2">
          {durationOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleQuickAction(option.value)}
              className="px-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-surface transition-colors press"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Quick action buttons for interests question */}
      {isInterestsQuestion && onSend && (
        <div className="mt-3 flex flex-wrap gap-2">
          {interestOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleQuickAction(option.value)}
              className="px-4 py-2 bg-card border border-border rounded-xl text-sm text-foreground hover:bg-surface transition-colors press"
            >
              {option.label}
            </button>
          ))}
        </div>
      )}

      {/* Quick reply button for plan confirmation */}
      {isPlanReadyMessage && onSend && (
        <button
          onClick={handleQuickReply}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl press hover:bg-primary/90 transition-colors"
        >
          Yes, let's go!
          <ArrowRight className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
