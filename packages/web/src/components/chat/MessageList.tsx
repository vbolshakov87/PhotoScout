import type { Message } from '@photoscout/shared';
import { MessageBubble } from './MessageBubble';

interface MessageListProps {
  messages: Message[];
  onSend?: (message: string) => void;
}

export function MessageList({ messages, onSend }: MessageListProps) {
  return (
    <div className="space-y-4">
      {messages.map((message, index) => (
        <MessageBubble
          key={message.id}
          message={message}
          onSend={onSend}
          isLastMessage={index === messages.length - 1}
        />
      ))}
    </div>
  );
}
