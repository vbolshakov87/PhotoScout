import { HtmlPreview } from '../shared/HtmlPreview';
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
      <div className="flex items-center justify-center h-full p-8 text-center">
        <div>
          <p className="text-gray-400 mb-2">No trip plan generated yet</p>
          <p className="text-sm text-gray-500">
            Chat with the assistant to create your interactive photography trip plan
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-4">
      <HtmlPreview html={htmlMessage.content} />
    </div>
  );
}
