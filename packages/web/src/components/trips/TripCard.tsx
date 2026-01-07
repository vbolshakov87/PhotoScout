import { MapPin, Calendar, Navigation } from 'lucide-react';
import type { Plan } from '@photoscout/shared';

interface TripCardProps {
  plan: Plan;
  onClick: () => void;
}

export function TripCard({ plan, onClick }: TripCardProps) {
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl p-4 cursor-pointer hover:bg-card/80 transition-colors border border-white/10"
    >
      {/* Thumbnail placeholder - will show map preview in future */}
      <div className="w-full h-40 bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-3 flex items-center justify-center">
        <Navigation className="w-12 h-12 text-primary/40" />
      </div>

      {/* Trip Info */}
      <div className="space-y-2">
        <h3 className="font-semibold text-lg text-white line-clamp-1">
          {plan.title}
        </h3>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <MapPin className="w-4 h-4" />
          <span>{plan.city}</span>
        </div>

        <div className="flex items-center gap-2 text-sm text-gray-400">
          <Calendar className="w-4 h-4" />
          <span>{formatDate(plan.createdAt)}</span>
        </div>

        {plan.spotCount > 0 && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <span className="font-medium">{plan.spotCount} spots</span>
          </div>
        )}
      </div>
    </div>
  );
}
