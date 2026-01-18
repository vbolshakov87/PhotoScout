import { describe, it, expect } from 'vitest';
import { extractPlanParams, mergeParams, PlanParams } from '../lib/plan-params';

describe('extractPlanParams', () => {
  describe('city extraction', () => {
    it('should extract city name from message', () => {
      const result = extractPlanParams('I want to photograph Tokyo');
      expect(result.city).toBe('tokyo');
    });

    it('should extract destination with multiple words', () => {
      const result = extractPlanParams('Planning a trip to New York');
      expect(result.city).toBe('new york');
    });

    it('should extract nature destinations', () => {
      const result = extractPlanParams('Photo trip to the Dolomites');
      expect(result.city).toBe('dolomites');
    });

    it('should return null for unknown destinations', () => {
      const result = extractPlanParams('I want to visit somewhere nice');
      expect(result.city).toBeNull();
    });
  });

  describe('interests extraction', () => {
    it('should extract single interest', () => {
      const result = extractPlanParams('I love architecture photography');
      expect(result.interests).toBe('architecture');
    });

    it('should extract multiple interests', () => {
      const result = extractPlanParams('Interested in architecture and street photography');
      expect(result.interests).toContain('architecture');
      expect(result.interests).toContain('street');
    });

    it('should limit to 3 interests', () => {
      const result = extractPlanParams(
        'I like architecture, street, landscape, night, and portrait photography'
      );
      const interests = result.interests?.split('-') || [];
      expect(interests.length).toBeLessThanOrEqual(3);
    });

    it('should return null when no interests found', () => {
      const result = extractPlanParams('I want to visit Paris');
      expect(result.interests).toBeNull();
    });
  });

  describe('duration extraction', () => {
    it('should extract "X days" format', () => {
      const result = extractPlanParams('3 days in Paris');
      expect(result.duration).toBe('3');
    });

    it('should extract "X-day" format', () => {
      const result = extractPlanParams('5-day photo trip');
      expect(result.duration).toBe('5');
    });

    it('should extract "for X days" format', () => {
      const result = extractPlanParams('Photography for 4 days');
      expect(result.duration).toBe('4');
    });

    it('should handle "a week"', () => {
      const result = extractPlanParams('A week in Tokyo');
      expect(result.duration).toBe('7');
    });

    it('should handle "weekend"', () => {
      const result = extractPlanParams('Weekend trip to Amsterdam');
      expect(result.duration).toBe('2');
    });

    it('should return null when no duration found', () => {
      const result = extractPlanParams('I want to visit Rome');
      expect(result.duration).toBeNull();
    });
  });

  describe('combined extraction', () => {
    it('should extract all parameters from complete message', () => {
      const result = extractPlanParams(
        'I want to photograph Tokyo for 5 days, focusing on architecture and street photography'
      );
      expect(result.city).toBe('tokyo');
      expect(result.duration).toBe('5');
      expect(result.interests).toContain('architecture');
      expect(result.interests).toContain('street');
    });
  });
});

describe('mergeParams', () => {
  it('should merge new params into existing', () => {
    const existing: PlanParams = { city: 'paris', interests: null, duration: null };
    const newParams: PlanParams = { city: null, interests: 'architecture', duration: '3' };

    const result = mergeParams(existing, newParams);

    expect(result.city).toBe('paris');
    expect(result.interests).toBe('architecture');
    expect(result.duration).toBe('3');
  });

  it('should override existing with new values', () => {
    const existing: PlanParams = { city: 'paris', interests: 'landscape', duration: '3' };
    const newParams: PlanParams = { city: 'tokyo', interests: null, duration: '5' };

    const result = mergeParams(existing, newParams);

    expect(result.city).toBe('tokyo');
    expect(result.interests).toBe('landscape');
    expect(result.duration).toBe('5');
  });

  it('should keep existing when new is all null', () => {
    const existing: PlanParams = { city: 'paris', interests: 'street', duration: '2' };
    const newParams: PlanParams = { city: null, interests: null, duration: null };

    const result = mergeParams(existing, newParams);

    expect(result).toEqual(existing);
  });
});
