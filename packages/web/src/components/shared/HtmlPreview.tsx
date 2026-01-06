import { useRef, useEffect, useState } from 'react';
import { Maximize2, Minimize2 } from 'lucide-react';

interface HtmlPreviewProps {
  html: string;
}

export function HtmlPreview({ html }: HtmlPreviewProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    if (iframeRef.current) {
      const doc = iframeRef.current.contentDocument;
      if (doc) {
        doc.open();
        doc.write(html);
        doc.close();
      }
    }
  }, [html]);

  return (
    <div
      className={`relative bg-card rounded-xl overflow-hidden transition-all duration-300 ${
        isExpanded ? 'fixed inset-4 z-50' : 'h-[400px]'
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
        sandbox="allow-scripts"
        title="Photo Trip Plan"
      />
    </div>
  );
}
