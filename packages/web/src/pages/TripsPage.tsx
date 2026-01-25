import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, Loader2, LogIn, LayoutGrid, List } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import { getPlanDestination, type Plan } from '@photoscout/shared';
import { TripCard } from '../components/trips/TripCard';
import { TripListCard } from '../components/trips/TripListCard';
import { TripDetail } from '../components/trips/TripDetail';
import { getUserId } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

/**
 * Renders the My Trips page: fetches and displays saved trip plans, loads destination images, supports grid and list views, opens trip details (HTML or inline), deletes trips, and prompts guest users to sign in with Google.
 *
 * @returns The Trips page React element.
 */
export function TripsPage() {
  const { planId } = useParams<{ planId?: string }>();
  const navigate = useNavigate();
  const { isGuest, login } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cityImages, setCityImages] = useState<Record<string, string | null>>({});
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const handleGoogleSuccess = (credentialResponse: CredentialResponse) => {
    if (credentialResponse.credential) {
      login(credentialResponse.credential);
    }
  };

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const visitorId = getUserId();
        const response = await fetch(`/api/plans?visitorId=${visitorId}`);
        if (!response.ok) throw new Error('Failed to fetch plans');
        const data = await response.json();
        const fetchedPlans = data.items || [];
        setPlans(fetchedPlans);

        // Fetch destination images for all unique destinations
        const uniqueDestinations = [
          ...new Set(fetchedPlans.map((p: Plan) => getPlanDestination(p)).filter(Boolean)),
        ] as string[];
        if (uniqueDestinations.length > 0) {
          // Fetch images in parallel via /api/destinations/:id
          const fetchImage = async (destination: string) => {
            try {
              const slug = destination
                .toLowerCase()
                .replace(/\s+/g, '-')
                .replace(/[^a-z0-9-]/g, '');
              const res = await fetch(`/api/destinations/${encodeURIComponent(slug)}`);
              if (res.ok) {
                const data = await res.json();
                if (data.imageUrl) {
                  setCityImages((prev) => ({ ...prev, [destination]: data.imageUrl }));
                }
              }
            } catch (e) {
              console.warn(`Failed to load image for ${destination}:`, e);
            }
          };

          // Fetch in batches of 3 to respect rate limiting
          for (let i = 0; i < uniqueDestinations.length; i += 3) {
            const batch = uniqueDestinations.slice(i, i + 3);
            await Promise.all(batch.map(fetchImage));
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load trips');
      } finally {
        setIsLoading(false);
      }
    };
    fetchPlans();
  }, []);

  useEffect(() => {
    if (planId && plans.length > 0) {
      const plan = plans.find((p) => p.planId === planId);
      if (plan) loadPlanDetail(plan);
    }
  }, [planId, plans]);

  const loadPlanDetail = async (plan: Plan) => {
    try {
      if (plan.htmlUrl && !window.webkit) {
        window.open(plan.htmlUrl, '_blank');
        return;
      }
      setSelectedPlan(plan);
      if (plan.htmlUrl) {
        const response = await fetch(plan.htmlUrl);
        if (!response.ok) throw new Error('Failed to fetch HTML content');
        setHtmlContent(await response.text());
      } else if (plan.htmlContent) {
        setHtmlContent(plan.htmlContent);
      }
      navigate(`/trips/${plan.planId}`);
    } catch (_err) {
      setError('Failed to load trip details');
    }
  };

  const handleBack = () => {
    setSelectedPlan(null);
    setHtmlContent('');
    navigate('/trips');
  };

  const handleDelete = async () => {
    if (!selectedPlan) return;
    try {
      const visitorId = getUserId();
      const response = await fetch(`/api/plans/${selectedPlan.planId}?visitorId=${visitorId}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete plan');
      setPlans((prev) => prev.filter((p) => p.planId !== selectedPlan.planId));
      handleBack();
    } catch (_err) {
      setError('Failed to delete trip');
    }
  };

  if (selectedPlan && htmlContent) {
    return (
      <TripDetail
        plan={selectedPlan}
        htmlContent={htmlContent}
        onBack={handleBack}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className="flex flex-col h-full glass-bg morphing-blobs">
      {/* Header */}
      <header className="relative px-4 pt-4 pb-3 liquid-glass glass-reflection border-b border-white/10 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Map className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-white tracking-tight">My Trips</h1>
              <p className="text-xs text-white/40">
                {isLoading ? 'Loading...' : `${plans.length} saved`}
              </p>
            </div>
          </div>

          {/* View Toggle */}
          {plans.length > 0 && (
            <div className="flex items-center gap-1 p-1 liquid-glass rounded-lg">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'grid'
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-md transition-all duration-200 ${
                  viewMode === 'list'
                    ? 'bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md'
                    : 'text-white/50 hover:text-white hover:bg-white/5'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto glass-scrollbar p-4 relative z-10">
        {error && (
          <div className="mb-4 px-4 py-3 liquid-glass bg-danger/10 border-danger/30 rounded-xl text-danger text-sm">
            {error}
          </div>
        )}

        {isGuest ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center mb-4 animate-pulse-glow">
              <LogIn className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-white text-sm font-medium">Sign in to see your trips</p>
            <p className="text-white/50 text-xs mt-1 mb-4">
              Your trips will be saved when you sign in
            </p>
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => console.error('Login failed')}
              theme="outline"
              size="large"
              text="signin_with"
              shape="rectangular"
              use_fedcm_for_prompt={false}
            />
          </div>
        ) : isLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="relative">
              <Loader2 className="w-6 h-6 text-violet-400 animate-spin" />
              <div className="absolute inset-0 w-6 h-6 rounded-full bg-violet-400/20 animate-ping" />
            </div>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/20 to-indigo-600/20 border border-white/10 flex items-center justify-center mb-4">
              <Map className="w-8 h-8 text-violet-400" />
            </div>
            <p className="text-white/70 text-sm">No trips yet</p>
            <p className="text-white/40 text-xs mt-1">Start a chat to create your first trip</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-2 gap-3">
            {plans.map((plan) => (
              <TripCard
                key={plan.planId}
                plan={plan}
                onClick={() => loadPlanDetail(plan)}
                imageUrl={cityImages[getPlanDestination(plan) || '']}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {plans.map((plan) => (
              <TripListCard
                key={plan.planId}
                plan={plan}
                onClick={() => loadPlanDetail(plan)}
                imageUrl={cityImages[getPlanDestination(plan) || '']}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
