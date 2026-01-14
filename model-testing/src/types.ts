// Model testing types

export interface ModelConfig {
  id: string;
  name: string;
  provider: 'openai' | 'anthropic' | 'google' | 'deepseek';
  apiModel: string;
  inputCostPer1M: number;
  outputCostPer1M: number;
  tier: 'ultra-budget' | 'budget' | 'quality';
  notes?: string;
  enabled?: boolean; // default true, set false to skip in tests
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  model: string;
  latencyMs: number;
  inputTokens?: number;
  outputTokens?: number;
}

export interface TestCase {
  id: string;
  name: string;
  description: string;
  messages: Message[];
  evaluate: (responses: LLMResponse[]) => TestResult;
}

export interface TestResult {
  passed: boolean;
  score: number; // 0-1
  checks: CheckResult[];
  notes?: string;
}

export interface CheckResult {
  name: string;
  passed: boolean;
  details?: string;
}

export interface ModelTestResult {
  modelId: string;
  modelName: string;
  testId: string;
  testName: string;
  passed: boolean;
  score: number;
  checks: CheckResult[];
  latencyMs: number;
  responses: string[];
  notes?: string;
  error?: string;
}

export interface TestSuiteResult {
  timestamp: string;
  duration: number;
  models: ModelSummary[];
  results: ModelTestResult[];
}

export interface ModelSummary {
  id: string;
  name: string;
  provider: string;
  totalTests: number;
  passed: number;
  failed: number;
  score: number; // percentage
  avgLatency: number;
  estimatedCostPerConv: number;
}
