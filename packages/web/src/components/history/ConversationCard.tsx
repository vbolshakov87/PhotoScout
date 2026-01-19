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
      className="w-full text-left liquid-glass glass-prismatic rounded-xl p-4 hover:border-white/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center shrink-0">
          <MessageSquare className="w-5 h-5 text-violet-400" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <h3 className="font-medium text-white text-sm truncate">{conversation.title}</h3>
            <span className="text-xs text-white/40 shrink-0">
              {formatDate(conversation.updatedAt)}
            </span>
          </div>

          {conversation.lastMessage && (
            <p className="text-sm text-white/60 line-clamp-1 mb-2">{conversation.lastMessage}</p>
          )}

          <div className="flex items-center gap-3 text-xs text-white/40">
            {conversation.city && (
              <span className="flex items-center gap-1 px-2 py-0.5 bg-white/5 rounded-full">
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
