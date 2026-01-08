import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { Plan } from '@photoscout/shared';
import { TripCard } from '../components/trips/TripCard';
import { TripDetail } from '../components/trips/TripDetail';
import { getUserId } from '../lib/storage';

export function TripsPage() {
  const { planId } = useParams<{ planId?: string }>();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        setIsLoading(true);
        const visitorId = getUserId();

        const response = await fetch(`/api/plans?visitorId=${visitorId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch plans');
        }

        const data = await response.json();
        setPlans(data.items || []);
      } catch (err) {
        console.error('Error fetching plans:', err);
        setError(err instanceof Error ? err.message : 'Failed to load trips');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlans();
  }, []);

  // Load specific plan if planId is in URL
  useEffect(() => {
    if (planId && plans.length > 0) {
      const plan = plans.find((p) => p.planId === planId);
      if (plan) {
        loadPlanDetail(plan);
      }
    }
  }, [planId, plans]);

  const loadPlanDetail = async (plan: Plan) => {
    try {
      setSelectedPlan(plan);

      // If plan has htmlUrl, fetch it from S3
      if (plan.htmlUrl) {
        const response = await fetch(plan.htmlUrl);
        if (!response.ok) {
          throw new Error('Failed to fetch HTML content');
        }
        const html = await response.text();
        setHtmlContent(html);
      } else if (plan.htmlContent) {
        // Legacy: use stored HTML content
        setHtmlContent(plan.htmlContent);
      }

      navigate(`/trips/${plan.planId}`);
    } catch (err) {
      console.error('Error loading plan detail:', err);
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
      const response = await fetch(
        `/api/plans/${selectedPlan.planId}?visitorId=${visitorId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        throw new Error('Failed to delete plan');
      }

      // Remove from list
      setPlans((prev) => prev.filter((p) => p.planId !== selectedPlan.planId));

      // Go back to list
      handleBack();
    } catch (err) {
      console.error('Error deleting plan:', err);
      setError('Failed to delete trip');
    }
  };

  // Show detail view if a plan is selected
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

  // Show list view
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-white/10 bg-background">
        <h1 className="text-2xl font-bold">My Trips</h1>
        <p className="text-sm text-gray-400 mt-1">
          {plans.length} {plans.length === 1 ? 'trip' : 'trips'} saved
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-4">
            <p className="text-red-500">{error}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-400">Loading trips...</div>
          </div>
        ) : plans.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <div className="text-gray-400 mb-2">No trips yet</div>
            <p className="text-sm text-gray-500">
              Create your first photo trip plan to see it here
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {plans.map((plan) => (
              <TripCard
                key={plan.planId}
                plan={plan}
                onClick={() => loadPlanDetail(plan)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
