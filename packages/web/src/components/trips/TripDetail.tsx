import { ArrowLeft, Share2, Trash2, ExternalLink } from 'lucide-react';
import type { Plan } from '@photoscout/shared';
import { HtmlPreview } from '../shared/HtmlPreview';
import { useNativeBridge } from '../../hooks/useNativeBridge';

interface TripDetailProps {
  plan: Plan;
  htmlContent: string;
  onBack: () => void;
  onDelete: () => void;
}

export function TripDetail({ plan, htmlContent, onBack, onDelete }: TripDetailProps) {
  const { share, haptic } = useNativeBridge();

  const handleShare = () => {
    haptic('light');
    share(htmlContent, plan.title);
  };

  const handleOpenNewTab = () => {
    haptic('light');
    if (plan.htmlUrl) {
      window.open(plan.htmlUrl, '_blank');
    } else {
      // Fallback: create a blob URL if no S3 URL exists
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
    }
  };

  const handleDelete = () => {
    haptic('medium');
    if (confirm(`Delete "${plan.title}"?`)) {
      onDelete();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 p-4 border-b border-white/10 bg-background">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-base md:text-lg truncate">{plan.title}</h1>
          <p className="text-xs md:text-sm text-gray-400 truncate">{plan.city}</p>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={handleOpenNewTab}
            title="Open in New Tab"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <ExternalLink className="w-5 h-5" />
          </button>

          <button
            onClick={handleShare}
            title="Share"
            className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <Share2 className="w-5 h-5" />
          </button>

          <button
            onClick={handleDelete}
            title="Delete"
            className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* HTML Preview */}
      <div className="flex-1 overflow-hidden">
        <HtmlPreview html={htmlContent} fillContainer />
      </div>
    </div>
  );
}
