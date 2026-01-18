import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Map, Loader2, LogIn } from 'lucide-react';
import { GoogleLogin, CredentialResponse } from '@react-oauth/google';
import type { Plan } from '@photoscout/shared';
import { TripCard } from '../components/trips/TripCard';
import { TripDetail } from '../components/trips/TripDetail';
import { getUserId } from '../lib/storage';
import { useAuth } from '../contexts/AuthContext';

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

        // Fetch city images for all unique cities
        const uniqueCities = [...new Set(fetchedPlans.map((p: Plan) => p.city).filter(Boolean))];
        if (uniqueCities.length > 0) {
          try {
            const imagesResponse = await fetch('/api/images/cities', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ cities: uniqueCities }),
            });
            if (imagesResponse.ok) {
              const imagesData = await imagesResponse.json();
              const images = imagesData.images || {};
              setCityImages(images);

              // For any cities without cached images, trigger generation in background
              const missingCities = (uniqueCities as string[]).filter((city) => !images[city]);
              missingCities.forEach((city) => {
                fetch(`/api/images/city/${encodeURIComponent(city)}`)
                  .then((res) => res.json())
                  .then((data) => {
                    if (data.imageUrl) {
                      setCityImages((prev) => ({ ...prev, [city]: data.imageUrl }));
                    }
                  })
                  .catch((e) => console.warn(`Failed to load image for ${city}:`, e));
              });
            }
          } catch {
            // Silently fail for images - they're not critical
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <header className="px-4 py-4 border-b border-border bg-surface">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
            <Map className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-semibold text-foreground">My Trips</h1>
            <p className="text-xs text-muted">
              {isLoading ? 'Loading...' : `${plans.length} saved`}
            </p>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto hide-scrollbar p-4">
        {error && (
          <div className="mb-4 px-4 py-3 bg-danger/10 border border-danger/20 rounded-lg text-danger text-sm">
            {error}
          </div>
        )}

        {isGuest ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <LogIn className="w-12 h-12 text-muted/50 mb-4" />
            <p className="text-foreground text-sm font-medium">Sign in to see your trips</p>
            <p className="text-muted/70 text-xs mt-1 mb-4">
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
            <Loader2 className="w-6 h-6 text-muted animate-spin" />
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-center">
            <Map className="w-12 h-12 text-muted/50 mb-4" />
            <p className="text-muted text-sm">No trips yet</p>
            <p className="text-muted/70 text-xs mt-1">Start a chat to create your first trip</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {plans.map((plan) => (
              <TripCard
                key={plan.planId}
                plan={plan}
                onClick={() => loadPlanDetail(plan)}
                imageUrl={cityImages[plan.city]}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
