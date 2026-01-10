import { HtmlPreview } from '../shared/HtmlPreview';
import { FileText } from 'lucide-react';
import type { Message } from '@photoscout/shared';

interface PreviewTabProps {
  messages: Message[];
}

export function PreviewTab({ messages }: PreviewTabProps) {
  // Find the most recent complete HTML message
  const htmlMessage = messages
    .slice()
    .reverse()
    .find((msg) => msg.content.includes('<!DOCTYPE html>') && msg.content.includes('</html>'));

  if (!htmlMessage) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center bg-background">
        <div className="w-16 h-16 rounded-2xl bg-card flex items-center justify-center mb-6">
          <FileText className="w-8 h-8 text-muted" />
        </div>
        <p className="text-foreground font-medium mb-2">No trip plan yet</p>
        <p className="text-sm text-muted max-w-xs">
          Chat with the assistant to generate your interactive photography trip plan
        </p>
      </div>
    );
  }

  return (
    <div className="h-full bg-background">
      <HtmlPreview html={htmlMessage.content} fillContainer />
    </div>
  );
}
