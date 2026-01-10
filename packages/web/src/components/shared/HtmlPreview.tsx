import { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface HtmlPreviewProps {
  html: string;
  fillContainer?: boolean;
}

// Extract only the HTML content, removing any text before <!DOCTYPE html> or <html>
function extractHtml(content: string): { html: string; prefix: string } {
  const doctypeIndex = content.indexOf('<!DOCTYPE html>');
  if (doctypeIndex !== -1) {
    return {
      html: content.substring(doctypeIndex),
      prefix: content.substring(0, doctypeIndex).trim()
    };
  }

  const htmlIndex = content.indexOf('<html');
  if (htmlIndex !== -1) {
    return {
      html: content.substring(htmlIndex),
      prefix: content.substring(0, htmlIndex).trim()
    };
  }

  return { html: content, prefix: '' };
}

export function HtmlPreview({ html, fillContainer = false }: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { html: extractedHtml, prefix } = extractHtml(html);

  useEffect(() => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = extractedHtml;
    }
  }, [extractedHtml]);

  // Fullscreen mode
  if (isExpanded) {
    return (
      <div className="fixed inset-0 z-50 bg-background">
        <button
          onClick={() => setIsExpanded(false)}
          className="absolute top-4 right-4 z-10 p-2 bg-card border border-border rounded-lg hover:bg-surface transition-colors"
        >
          <Minimize2 className="w-5 h-5 text-foreground" />
        </button>
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Photo Trip Plan"
        />
      </div>
    );
  }

  // fillContainer mode (Preview tab)
  if (fillContainer) {
    return (
      <div className="h-full flex flex-col">
        <div className="relative flex-1 bg-card overflow-hidden">
          <button
            onClick={() => setIsExpanded(true)}
            className="absolute top-3 right-3 z-10 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
          >
            <Maximize2 className="w-4 h-4 text-white" />
          </button>
          <iframe
            ref={iframeRef}
            className="w-full h-full border-0"
            sandbox="allow-scripts allow-same-origin"
            title="Photo Trip Plan"
          />
        </div>
      </div>
    );
  }

  // Inline mode (in chat)
  return (
    <div className="space-y-2">
      {prefix && (
        <div className="px-4 py-2 bg-card border border-border rounded-lg text-sm text-foreground">
          {prefix}
        </div>
      )}
      <div className="relative h-[400px] bg-card rounded-xl overflow-hidden">
        <button
          onClick={() => setIsExpanded(true)}
          className="absolute top-3 right-3 z-10 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
        >
          <Maximize2 className="w-4 h-4 text-white" />
        </button>
        <iframe
          ref={iframeRef}
          className="w-full h-full border-0"
          sandbox="allow-scripts allow-same-origin"
          title="Photo Trip Plan"
        />
      </div>
    </div>
  );
}
