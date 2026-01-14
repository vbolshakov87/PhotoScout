import type { Message } from '@photoscout/shared';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  onSend?: (message: string) => void;
  onSuggest?: (text: string) => void;
}

export function MessageList({ messages, onSend, onSuggest }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          onSend={onSend}
          onSuggest={onSuggest}
          isLastMessage={index === messages.length - 1}
        />
      ))}
    </div>
  );
}
