import { MapPin, Clock, Camera, ChevronRight } from 'lucide-react';
import { getPlanDestination, type Plan } from '@photoscout/shared';
import { useState } from 'react';

interface TripListCardProps {
  plan: Plan;
  onClick: () => void;
  imageUrl?: string | null;
}

/**
 * Renders an interactive trip list card showing title, destination, creation date, thumbnail, and brief metadata.
 *
 * @param plan - Plan data used to populate the card (title, derived destination, createdAt, spotCount, dates)
 * @param onClick - Click handler invoked when the card is activated
 * @param imageUrl - Optional thumbnail URL; falls back to a visual placeholder if omitted or if loading fails
 * @returns The rendered trip list card element
 */
export function TripListCard({ plan, onClick, imageUrl }: TripListCardProps) {
  const [imageError, setImageError] = useState(false);
  const destination = getPlanDestination(plan);

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <button
      onClick={onClick}
      className="w-full liquid-glass glass-prismatic rounded-xl p-3 flex items-center gap-3 hover:border-white/20 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99]"
    >
      {/* Thumbnail */}
      <div className="w-16 h-16 rounded-lg overflow-hidden shrink-0 border border-white/10">
        {imageUrl && !imageError ? (
          <img
            src={imageUrl}
            alt={destination}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-violet-900/50 to-indigo-900/50 flex items-center justify-center">
            <Camera className="w-6 h-6 text-white/20" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 text-left">
        <h3 className="font-semibold text-white text-sm truncate mb-0.5">{plan.title}</h3>
        <p className="text-xs text-white/50 mb-1.5">
          {destination && <span>{destination} • </span>}
          {formatDate(plan.createdAt)}
        </p>
        <div className="flex items-center gap-2 text-xs text-white/40">
          {plan.spotCount > 0 && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              {plan.spotCount} spots
            </span>
          )}
          {plan.dates && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {plan.dates}
            </span>
          )}
        </div>
      </div>

      {/* Arrow */}
      <ChevronRight className="w-5 h-5 text-white/30 shrink-0" />
    </button>
  );
}
