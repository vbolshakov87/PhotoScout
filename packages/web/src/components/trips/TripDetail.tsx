import { ArrowLeft, Share2, Trash2 } from 'lucide-react';
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

  const handleDelete = () => {
    haptic('medium');
    if (confirm(`Delete "${plan.title}"?`)) {
      onDelete();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 bg-background">
        <button
          onClick={onBack}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <h1 className="font-semibold text-lg">{plan.title}</h1>
          <p className="text-sm text-gray-400">{plan.city}</p>
        </div>
        <button
          onClick={handleShare}
          className="p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          <Share2 className="w-5 h-5" />
        </button>
        <button
          onClick={handleDelete}
          className="p-2 hover:bg-red-500/10 text-red-500 rounded-lg transition-colors"
        >
          <Trash2 className="w-5 h-5" />
        </button>
      </div>

      {/* HTML Preview */}
      <div className="flex-1 overflow-y-auto p-4">
        <HtmlPreview html={htmlContent} />
      </div>
    </div>
  );
}
