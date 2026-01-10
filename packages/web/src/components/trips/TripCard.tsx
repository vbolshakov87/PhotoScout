import { MapPin, Calendar, Camera } from 'lucide-react';
import type { Plan } from '@photoscout/shared';
import { useState } from 'react';

interface TripCardProps {
  plan: Plan;
  onClick: () => void;
  imageUrl?: string | null;
}

export function TripCard({ plan, onClick, imageUrl }: TripCardProps) {
  const [imageError, setImageError] = useState(false);

  const formatDate = (timestamp: number) => {
    if (plan.dates) return plan.dates;
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 transition-colors press"
    >
      {/* Thumbnail */}
      <div className="w-full aspect-[4/3] bg-surface flex items-center justify-center relative overflow-hidden">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={plan.city}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <Camera className="w-8 h-8 text-muted/50" />
        )}
      </div>

      {/* Content */}
      <div className="p-3">
        <h3 className="font-medium text-foreground text-sm line-clamp-2 mb-2">
          {plan.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-muted mb-1">
          <MapPin className="w-3 h-3" />
          <span className="truncate">{plan.city}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-xs text-muted">
            <Calendar className="w-3 h-3" />
            <span>{formatDate(plan.createdAt)}</span>
          </div>

          {plan.spotCount > 0 && (
            <span className="text-xs text-primary">{plan.spotCount} spots</span>
          )}
        </div>
      </div>
    </button>
  );
}
