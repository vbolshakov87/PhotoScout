import { MapPin, Clock, Camera } from 'lucide-react';
import { getPlanDestination, type Plan } from '@photoscout/shared';
import { useState } from 'react';

interface TripCardProps {
  plan: Plan;
  onClick: () => void;
  imageUrl?: string | null;
}

export function TripCard({ plan, onClick, imageUrl }: TripCardProps) {
  const [imageError, setImageError] = useState(false);
  const destination = getPlanDestination(plan);

  return (
    <button
      onClick={onClick}
      className="relative w-full rounded-2xl overflow-hidden aspect-[4/5] group border border-white/10 shadow-lg hover:shadow-xl hover:shadow-violet-500/10 hover:border-white/20 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] transform-gpu"
    >
      {/* Full background image */}
      {imageUrl && !imageError ? (
        <img
          src={imageUrl}
          alt={destination}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-violet-900/50 to-indigo-900/50 flex items-center justify-center">
          <Camera className="w-12 h-12 text-white/20" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

      {/* Location badge - top left */}
      {destination && (
        <div className="absolute top-3 left-3">
          <span className="px-2.5 py-1 bg-gradient-to-r from-violet-500 to-indigo-600 backdrop-blur-md rounded-lg text-white text-xs font-semibold shadow-lg">
            {destination}
          </span>
        </div>
      )}

      {/* Content - bottom */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <h3 className="text-white text-sm font-semibold text-left leading-tight mb-2 drop-shadow-lg line-clamp-2">
          {plan.title}
        </h3>

        <div className="flex items-center gap-2 text-white/80 text-xs trip-card-label">
          {plan.spotCount > 0 && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full">
              <MapPin className="w-3 h-3" />
              <span>{plan.spotCount} spots</span>
            </div>
          )}
          {plan.dates && (
            <div className="flex items-center gap-1 px-2 py-0.5 bg-white/10 backdrop-blur-sm rounded-full">
              <Clock className="w-3 h-3" />
              <span>{plan.dates}</span>
            </div>
          )}
        </div>
      </div>
    </button>
  );
}
