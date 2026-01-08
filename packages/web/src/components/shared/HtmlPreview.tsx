import { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface HtmlPreviewProps {
  html: string;
  fillContainer?: boolean;
}

// Extract only the HTML content, removing any text before <!DOCTYPE html> or <html>
function extractHtml(content: string): { html: string; prefix: string } {
  // Try to find <!DOCTYPE html> first
  const doctypeIndex = content.indexOf('<!DOCTYPE html>');
  if (doctypeIndex !== -1) {
    return {
      html: content.substring(doctypeIndex),
      prefix: content.substring(0, doctypeIndex).trim()
    };
  }

  // Fallback to finding <html> tag
  const htmlIndex = content.indexOf('<html');
  if (htmlIndex !== -1) {
    return {
      html: content.substring(htmlIndex),
      prefix: content.substring(0, htmlIndex).trim()
    };
  }

  // If no HTML found, return as-is
  return { html: content, prefix: '' };
}

export function HtmlPreview({ html, fillContainer = false }: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const { html: extractedHtml, prefix } = extractHtml(html);

  console.log('[HtmlPreview] Rendering iframe with HTML:', {
    originalLength: html.length,
    extractedLength: extractedHtml.length,
    hasPrefix: !!prefix,
    prefixContent: prefix
  });

  useEffect(() => {
    if (iframeRef.current) {
      console.log('[HtmlPreview] Setting iframe srcdoc');
      // Use srcdoc to set HTML - this properly reloads the iframe content
      iframeRef.current.srcdoc = extractedHtml;
    } else {
      console.warn('[HtmlPreview] iframeRef.current is null');
    }
  }, [extractedHtml]);

  return (
    <div className={`space-y-2 ${fillContainer ? 'h-full flex flex-col' : ''}`}>
      {prefix && (
        <div className="px-4 py-2 bg-card/50 rounded-lg text-sm text-foreground/80">
          {prefix}
        </div>
      )}
      <div
        className={`relative bg-card rounded-xl overflow-hidden transition-all duration-300 ${
          isExpanded ? 'fixed inset-4 z-50' : fillContainer ? 'flex-1' : 'h-[400px]'
        }`}
      >
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="absolute top-2 right-2 z-10 p-2 bg-black/50 rounded-lg hover:bg-black/70 transition-colors"
        >
          {isExpanded ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
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
