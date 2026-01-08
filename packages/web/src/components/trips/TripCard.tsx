import { MapPin, Calendar, Navigation } from 'lucide-react';
import type { Plan } from '@photoscout/shared';

interface TripCardProps {
  plan: Plan;
  onClick: () => void;
}

export function TripCard({ plan, onClick }: TripCardProps) {
  const formatDate = (timestamp: number) => {
    if (plan.dates) return plan.dates;
    
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div
      onClick={onClick}
      className="bg-card rounded-xl p-3 cursor-pointer hover:bg-card/80 transition-colors border border-white/10 flex flex-col h-full"
    >
      {/* Thumbnail placeholder - will show map preview in future */}
      <div className="w-full aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-lg mb-2 flex items-center justify-center overflow-hidden">
        <Navigation className="w-8 h-8 text-primary/40" />
      </div>

      {/* Trip Info */}
      <div className="space-y-1 flex-1">
        <h3 className="font-semibold text-sm md:text-base text-white line-clamp-2 leading-tight">
          {plan.title}
        </h3>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <MapPin className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{plan.city}</span>
        </div>

        <div className="flex items-center gap-1.5 text-xs text-gray-400">
          <Calendar className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{formatDate(plan.createdAt)}</span>
        </div>

        {plan.spotCount > 0 && (
          <div className="flex items-center gap-1.5 text-[10px] md:text-xs text-primary pt-1">
            <span className="font-medium">{plan.spotCount} spots</span>
          </div>
        )}
      </div>
    </div>
  );
}
