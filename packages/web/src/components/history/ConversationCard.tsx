import { MessageSquare, Calendar, MapPin } from 'lucide-react';
import type { Conversation } from '@photoscout/shared';

interface ConversationCardProps {
  conversation: Conversation;
  onClick: () => void;
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 transition-colors border border-white/10"
    >
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <MessageSquare className="w-5 h-5 text-primary" />
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white line-clamp-1 mb-1">
            {conversation.title}
          </h3>

          {conversation.lastMessage && (
            <p className="text-sm text-gray-400 line-clamp-2 mb-2">
              {conversation.lastMessage}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-gray-500">
            {conversation.city && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{conversation.city}</span>
              </div>
            )}

            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>{formatDate(conversation.updatedAt)}</span>
            </div>

            <div className="flex items-center gap-1">
              <MessageSquare className="w-3 h-3" />
              <span>{conversation.messageCount} messages</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
