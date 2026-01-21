/**
 * Output Validator for PhotoScout
 *
 * Post-generation validation layer that checks LLM responses before
 * returning them to users. Detects:
 * - System prompt leakage
 * - Off-topic content
 * - PII patterns
 * - Harmful content patterns
 *
 * Can be configured to block, flag, or log violations.
 */

export interface ValidationResult {
  isValid: boolean;
  violations: Violation[];
  sanitizedContent?: string;
  metadata: {
    originalLength: number;
    processingTimeMs: number;
    checksPerformed: string[];
  };
}

export interface Violation {
  type: ViolationType;
  severity: 'critical' | 'high' | 'medium' | 'low';
  description: string;
  matchedPattern?: string;
  position?: { start: number; end: number };
}

export type ViolationType =
  | 'system_prompt_leakage'
  | 'off_topic_content'
  | 'pii_detected'
  | 'harmful_content'
  | 'code_generation'
  | 'instruction_following';

export interface ValidatorConfig {
  /** Block responses that fail validation */
  blockOnViolation: boolean;
  /** Minimum severity to block (if blockOnViolation is true) */
  blockSeverity: 'critical' | 'high' | 'medium' | 'low';
  /** Log violations to console/CloudWatch */
  logViolations: boolean;
  /** Attempt to sanitize responses (remove violating content) */
  sanitize: boolean;
  /** Custom patterns to check for */
  customPatterns?: { pattern: RegExp; type: ViolationType; severity: Violation['severity'] }[];
}

const DEFAULT_CONFIG: ValidatorConfig = {
  blockOnViolation: true,
  blockSeverity: 'critical',
  logViolations: true,
  sanitize: false,
};

// System prompt leakage patterns (from actual prompt)
const LEAKAGE_PATTERNS: { pattern: RegExp; keyword: string }[] = [
  { pattern: /Vladimir Bolshakov/i, keyword: 'Vladimir Bolshakov' },
  { pattern: /SECURITY RULES/i, keyword: 'SECURITY RULES' },
  { pattern: /MANDATORY - NEVER IGNORE/i, keyword: 'MANDATORY - NEVER IGNORE' },
  { pattern: /Phase 1: Clarifying Questions/i, keyword: 'Phase 1' },
  { pattern: /Phase 2: Proposed Plan/i, keyword: 'Phase 2' },
  { pattern: /Phase 3: JSON Generation/i, keyword: 'Phase 3' },
  { pattern: /JSON Output Requirements/i, keyword: 'JSON Output Requirements' },
  { pattern: /VIOLATION CHECK/i, keyword: 'VIOLATION CHECK' },
  { pattern: /CRITICAL JSON-ONLY RULES/i, keyword: 'JSON-ONLY RULES' },
  { pattern: /Token Efficiency/i, keyword: 'Token Efficiency' },
  { pattern: /streamChatResponse/i, keyword: 'streamChatResponse' },
  { pattern: /dailySchedule.*required/i, keyword: 'dailySchedule' },
  { pattern: /sunriseSunset.*must include/i, keyword: 'sunriseSunset' },
  { pattern: /mapCenter.*mapZoom/i, keyword: 'mapCenter' },
  { pattern: /\[\[suggestions:multi\]\]/i, keyword: '[[suggestions:multi]]' },
  { pattern: /## Your Role/i, keyword: '## Your Role' },
  { pattern: /## Important Rules/i, keyword: '## Important Rules' },
];

// Photography-related keywords that indicate on-topic content
const ON_TOPIC_KEYWORDS = [
  'photography',
  'photo',
  'photograph',
  'camera',
  'lens',
  'tripod',
  'golden hour',
  'blue hour',
  'sunrise',
  'sunset',
  'landscape',
  'cityscape',
  'architecture',
  'travel',
  'trip',
  'destination',
  'location',
  'shoot',
  'shot',
  'composition',
  'lighting',
  'exposure',
];

// PII patterns
const PII_PATTERNS: { pattern: RegExp; type: string }[] = [
  // Email addresses
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, type: 'email' },
  // Phone numbers (various formats)
  { pattern: /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, type: 'phone' },
  // Credit card numbers
  { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, type: 'credit_card' },
  // SSN
  { pattern: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g, type: 'ssn' },
  // IP addresses
  { pattern: /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, type: 'ip_address' },
];

// Code generation patterns (shouldn't appear in photography responses)
const CODE_PATTERNS: { pattern: RegExp; language: string }[] = [
  { pattern: /```(python|javascript|typescript|java|c\+\+|rust|go)/i, language: 'code_block' },
  { pattern: /\bdef\s+\w+\s*\(/g, language: 'python' },
  { pattern: /\bfunction\s+\w+\s*\(/g, language: 'javascript' },
  { pattern: /\bconst\s+\w+\s*=\s*\(/g, language: 'javascript' },
  { pattern: /\bclass\s+\w+\s*[:{]/g, language: 'class_definition' },
  { pattern: /import\s+\{[^}]+\}\s+from/g, language: 'es_module' },
  { pattern: /console\.log\s*\(/g, language: 'javascript' },
  { pattern: /print\s*\(/g, language: 'python' },
];

// Harmful content patterns
const HARMFUL_PATTERNS: { pattern: RegExp; category: string }[] = [
  { pattern: /how to (make|build|create) (a )?(bomb|explosive|weapon)/i, category: 'weapons' },
  { pattern: /how to (hack|break into|exploit)/i, category: 'hacking' },
  { pattern: /(kill|murder|harm|hurt) (someone|people)/i, category: 'violence' },
  { pattern: /suicide|self.?harm/i, category: 'self_harm' },
  { pattern: /illegal drugs|how to (make|cook|produce) (meth|cocaine|heroin)/i, category: 'drugs' },
];

/**
 * Main validation function
 */
export function validateOutput(
  content: string,
  config: Partial<ValidatorConfig> = {}
): ValidationResult {
  const startTime = Date.now();
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };
  const violations: Violation[] = [];
  const checksPerformed: string[] = [];

  // Check for system prompt leakage
  checksPerformed.push('system_prompt_leakage');
  for (const { pattern, keyword } of LEAKAGE_PATTERNS) {
    const match = content.match(pattern);
    if (match) {
      violations.push({
        type: 'system_prompt_leakage',
        severity: 'critical',
        description: `System prompt leakage detected: "${keyword}"`,
        matchedPattern: match[0],
        position: {
          start: content.indexOf(match[0]),
          end: content.indexOf(match[0]) + match[0].length,
        },
      });
    }
  }

  // Check for off-topic content
  checksPerformed.push('off_topic_check');
  const lowerContent = content.toLowerCase();
  const onTopicScore = ON_TOPIC_KEYWORDS.filter((kw) => lowerContent.includes(kw)).length;

  // If response is long but has no photography keywords, flag it
  if (content.length > 200 && onTopicScore === 0) {
    violations.push({
      type: 'off_topic_content',
      severity: 'medium',
      description: 'Response contains no photography-related keywords',
    });
  }

  // Check for PII
  checksPerformed.push('pii_detection');
  for (const { pattern, type } of PII_PATTERNS) {
    const matches = content.match(pattern);
    if (matches) {
      for (const match of matches) {
        // Skip common false positives
        if (type === 'phone' && match.length < 10) continue;
        if (type === 'email' && match.includes('example.com')) continue;

        violations.push({
          type: 'pii_detected',
          severity: 'high',
          description: `PII detected: ${type}`,
          matchedPattern: match.substring(0, 4) + '****',
        });
      }
    }
  }

  // Check for code generation
  checksPerformed.push('code_generation_check');
  for (const { pattern, language } of CODE_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({
        type: 'code_generation',
        severity: 'medium',
        description: `Code generation detected: ${language}`,
        matchedPattern: language,
      });
    }
  }

  // Check for harmful content
  checksPerformed.push('harmful_content_check');
  for (const { pattern, category } of HARMFUL_PATTERNS) {
    if (pattern.test(content)) {
      violations.push({
        type: 'harmful_content',
        severity: 'critical',
        description: `Harmful content detected: ${category}`,
        matchedPattern: category,
      });
    }
  }

  // Check custom patterns
  if (mergedConfig.customPatterns) {
    checksPerformed.push('custom_patterns');
    for (const { pattern, type, severity } of mergedConfig.customPatterns) {
      if (pattern.test(content)) {
        violations.push({
          type,
          severity,
          description: `Custom pattern match: ${pattern.source}`,
        });
      }
    }
  }

  // Determine if valid
  const severityOrder = ['low', 'medium', 'high', 'critical'];
  const blockThreshold = severityOrder.indexOf(mergedConfig.blockSeverity);

  const hasBlockingViolation = violations.some(
    (v) => severityOrder.indexOf(v.severity) >= blockThreshold
  );

  const isValid = !mergedConfig.blockOnViolation || !hasBlockingViolation;

  // Log violations if configured
  if (mergedConfig.logViolations && violations.length > 0) {
    console.warn('[OutputValidator] Violations detected:', {
      count: violations.length,
      types: [...new Set(violations.map((v) => v.type))],
      severities: [...new Set(violations.map((v) => v.severity))],
      isBlocked: !isValid,
    });
  }

  // Attempt sanitization if configured
  let sanitizedContent: string | undefined;
  if (mergedConfig.sanitize && violations.length > 0) {
    sanitizedContent = sanitizeContent(content, violations);
  }

  return {
    isValid,
    violations,
    sanitizedContent,
    metadata: {
      originalLength: content.length,
      processingTimeMs: Date.now() - startTime,
      checksPerformed,
    },
  };
}

/**
 * Attempt to sanitize content by removing/redacting violations
 */
function sanitizeContent(content: string, violations: Violation[]): string {
  let sanitized = content;

  for (const violation of violations) {
    if (violation.matchedPattern && violation.position) {
      // Replace with redaction marker
      sanitized =
        sanitized.substring(0, violation.position.start) +
        '[REDACTED]' +
        sanitized.substring(violation.position.end);
    }
  }

  return sanitized;
}

/**
 * Quick check for critical violations only (faster)
 */
export function quickValidate(content: string): { passed: boolean; criticalViolation?: string } {
  // Check leakage (critical)
  for (const { pattern, keyword } of LEAKAGE_PATTERNS) {
    if (pattern.test(content)) {
      return { passed: false, criticalViolation: `Leakage: ${keyword}` };
    }
  }

  // Check harmful content (critical)
  for (const { pattern, category } of HARMFUL_PATTERNS) {
    if (pattern.test(content)) {
      return { passed: false, criticalViolation: `Harmful: ${category}` };
    }
  }

  return { passed: true };
}

/**
 * Get violation summary for logging/analytics
 */
export function getViolationSummary(
  violations: Violation[]
): Record<ViolationType, { count: number; severity: string }> {
  const summary: Record<string, { count: number; severity: string }> = {};

  for (const v of violations) {
    if (!summary[v.type]) {
      summary[v.type] = { count: 0, severity: v.severity };
    }
    summary[v.type].count++;
    // Keep highest severity
    const severityOrder = ['low', 'medium', 'high', 'critical'];
    if (severityOrder.indexOf(v.severity) > severityOrder.indexOf(summary[v.type].severity)) {
      summary[v.type].severity = v.severity;
    }
  }

  return summary as Record<ViolationType, { count: number; severity: string }>;
}

/**
 * Format violations for CloudWatch logging
 */
export function formatForCloudWatch(result: ValidationResult): object {
  return {
    timestamp: new Date().toISOString(),
    isValid: result.isValid,
    violationCount: result.violations.length,
    violations: result.violations.map((v) => ({
      type: v.type,
      severity: v.severity,
      description: v.description,
    })),
    metadata: result.metadata,
  };
}

// Export default configuration
export { DEFAULT_CONFIG };
