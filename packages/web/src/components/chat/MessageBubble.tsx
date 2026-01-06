import type { Message } from '@photoscout/shared';
import { HtmlPreview } from '../shared/HtmlPreview';
import { useNativeBridge } from '../../hooks/useNativeBridge';
import { Share2, Copy } from 'lucide-react';

interface MessageBubbleProps {
  message: Message;
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const { share, copyToClipboard, haptic } = useNativeBridge();
  const isUser = message.role === 'user';
  const isHtml = message.content.includes('<!DOCTYPE html>');

  const handleShare = () => {
    haptic('light');
    share(message.content, 'PhotoScout Trip Plan');
  };

  const handleCopy = () => {
    haptic('light');
    copyToClipboard(message.content);
  };

  if (isHtml) {
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
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
