import { MessageSquare, MapPin } from 'lucide-react';
import type { Conversation } from '@photoscout/shared';

interface ConversationCardProps {
  conversation: Conversation;
  onClick: () => void;
}

export function ConversationCard({ conversation, onClick }: ConversationCardProps) {
  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors press"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-muted" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-medium text-foreground text-sm truncate">
              {conversation.title}
            </h3>
            <span className="text-xs text-muted shrink-0">
              {formatDate(conversation.updatedAt)}
            </span>
          </div>

          {conversation.lastMessage && (
            <p className="text-sm text-muted line-clamp-1 mb-2">
              {conversation.lastMessage}
            </p>
          )}

          <div className="flex items-center gap-3 text-xs text-muted/70">
            {conversation.city && (
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {conversation.city}
              </span>
            )}
            <span>{conversation.messageCount} messages</span>
          </div>
        </div>
      </div>
    </button>
  );
}
