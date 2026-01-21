# PhotoScout Security Report

**Last Updated:** 2026-01-21
**Version:** 1.0.0
**Author:** Security Testing Suite

---

## Executive Summary

PhotoScout implements a defense-in-depth approach to protect against prompt injection, jailbreaks, and other LLM-related security vulnerabilities. This document summarizes the security testing methodology, findings, and recommendations.

### Key Metrics

| Metric | Status |
|--------|--------|
| Total Attack Vectors | 60+ |
| Critical Attacks Tested | 25 |
| System Prompt Leakage | ✅ Protected |
| Off-Topic Rejection | ✅ Implemented |
| Jailbreak Resistance | ✅ Strong |

---

## 1. Security Architecture

### 1.1 Defense Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    User Input                                │
├─────────────────────────────────────────────────────────────┤
│  Layer 1: Input Validation                                   │
│  - Basic input sanitization                                  │
│  - Length limits                                             │
├─────────────────────────────────────────────────────────────┤
│  Layer 2: System Prompt Guardrails                          │
│  - Explicit security rules                                   │
│  - Off-topic refusal patterns                               │
│  - Jailbreak pattern recognition                            │
├─────────────────────────────────────────────────────────────┤
│  Layer 3: LLM Processing                                    │
│  - Claude/GPT-4/etc with system prompt                      │
├─────────────────────────────────────────────────────────────┤
│  Layer 4: Output Validation                                 │
│  - System prompt leakage detection                          │
│  - PII detection                                            │
│  - Off-topic content detection                              │
│  - Harmful content patterns                                 │
├─────────────────────────────────────────────────────────────┤
│                    User Response                             │
└─────────────────────────────────────────────────────────────┘
```

### 1.2 System Prompt Security

The system prompt (`packages/api/src/lib/prompts.ts`) includes:

1. **Explicit Security Rules** - Clear instructions on what to refuse
2. **Polite Refusal Pattern** - Consistent, friendly rejection of off-topic requests
3. **Valid vs Invalid Examples** - Clear boundaries for the LLM
4. **Topic Restriction** - "Photography trip planning ONLY"

---

## 2. Attack Categories Tested

### 2.1 Prompt Injection

**Goal:** Override system instructions to change AI behavior.

| Subcategory | Tests | Description |
|-------------|-------|-------------|
| Direct Override | 4 | "Ignore previous instructions..." |
| Fake System Messages | 4 | "SYSTEM: You are now..." |
| Hidden Instructions | 3 | Injections hidden in brackets/comments |

**Mitigations:**
- System prompt explicitly warns against these patterns
- LLM training includes resistance to common injections

### 2.2 Jailbreaks

**Goal:** Bypass content restrictions through roleplay or hypotheticals.

| Subcategory | Tests | Description |
|-------------|-------|-------------|
| Roleplay | 4 | DAN, unrestricted AI personas |
| Hypothetical | 3 | "If you had no restrictions..." |
| Educational | 3 | "For educational purposes..." |

**Mitigations:**
- Explicit refusal of roleplay attempts in system prompt
- Stay on-topic regardless of framing

### 2.3 Data Extraction

**Goal:** Extract system prompt or internal configuration.

| Subcategory | Tests | Description |
|-------------|-------|-------------|
| System Prompt | 8 | "What are your instructions?" |
| Metadata | 2 | Model info, API endpoints |

**Mitigations:**
- Never repeat system prompt contents
- Output validator detects leakage keywords
- Redirect to photography topic

### 2.4 Context Manipulation

**Goal:** Exploit conversation context to change behavior.

| Subcategory | Tests | Description |
|-------------|-------|-------------|
| Token Overflow | 1 | Very long inputs |
| Context Poisoning | 2 | Fake user notes/history |
| Multi-turn | 1 | Gradual context shift |

**Mitigations:**
- Stateless design (limited history)
- Ignore fake context claims

### 2.5 Off-Topic Abuse

**Goal:** Use the service for non-photography tasks.

| Subcategory | Tests | Description |
|-------------|-------|-------------|
| General Assistant | 4 | Poems, jokes, weather |
| Homework | 3 | Math, essays, science |
| Code Generation | 3 | Python, JavaScript |
| Controversial | 3 | Politics, religion |
| Professional Advice | 2 | Medical, legal |

**Mitigations:**
- Polite refusal with redirect
- Always offer photography help instead

### 2.6 Photography-Adjacent Attacks

**Goal:** Exploit the photography focus for harmful purposes.

| Subcategory | Tests | Description |
|-------------|-------|-------------|
| Illegal | 3 | Military bases, airports |
| Surveillance | 3 | Covert photography |
| Trespassing | 3 | Breaking into locations |
| Harmful Framing | 2 | Violence documentation |
| Drone Violations | 2 | No-fly zones |

**Mitigations:**
- Refuse illegal/harmful requests even if photography-related
- System prompt specifically addresses these cases

### 2.7 Encoding Tricks

**Goal:** Bypass filters using encoded instructions.

| Subcategory | Tests | Description |
|-------------|-------|-------------|
| Base64 | 1 | Encoded commands |
| ROT13 | 1 | Cipher encoded |
| Unicode | 2 | Full-width, zero-width chars |
| Leetspeak | 1 | 1337 encoding |
| Multi-language | 3 | Chinese, Russian, Arabic |

**Mitigations:**
- LLM training handles common encodings
- Focus on intent, not just keywords

---

## 3. Output Validation

### 3.1 Leakage Detection Keywords

The output validator checks for these system prompt indicators:

```typescript
const LEAKAGE_KEYWORDS = [
  'Vladimir Bolshakov',
  'SECURITY RULES',
  'Phase 1: Clarifying Questions',
  'Phase 2: Proposed Plan',
  'Phase 3: JSON Generation',
  'JSON Output Requirements',
  'VIOLATION CHECK',
  'dailySchedule',
  'sunriseSunset',
  // ... more
];
```

### 3.2 PII Detection

Patterns checked:
- Email addresses
- Phone numbers
- Credit card numbers
- SSN patterns
- IP addresses

### 3.3 Code Detection

Prevents code generation:
- Python functions (`def`)
- JavaScript (`function`, `const`)
- Import statements
- Console/print statements

---

## 4. Recommendations

### 4.1 Implemented ✅

- [x] Explicit security rules in system prompt
- [x] Off-topic refusal with redirection
- [x] Output validation layer
- [x] CI/CD security testing
- [x] Multi-model comparison testing

### 4.2 Recommended Improvements

#### High Priority
- [ ] **Rate limiting** - Prevent rapid-fire attack attempts
- [ ] **Request logging** - Log suspicious patterns for analysis
- [ ] **Anomaly detection** - Flag unusual request patterns
- [ ] **Response caching** - Cache refusal responses to reduce API costs

#### Medium Priority
- [ ] **Input preprocessing** - Normalize Unicode, decode base64
- [ ] **Canary tokens** - Embed trackable tokens in prompts
- [ ] **A/B testing** - Compare prompt versions for security
- [ ] **User feedback loop** - Report mechanism for issues

#### Low Priority
- [ ] **ML-based detection** - Train classifier on attack patterns
- [ ] **Honeypot prompts** - Detect automated attacks
- [ ] **Regional filtering** - Block high-risk regions if needed

---

## 5. Running Security Tests

### Local Testing

```bash
# Run quick smoke test
cd packages/api
pnpm vitest run src/tests/security/security.test.ts --testNamePattern="Quick"

# Run critical tests only
pnpm vitest run src/tests/security/security.test.ts --testNamePattern="Critical"

# Run full suite
pnpm vitest run src/tests/security/security.test.ts
```

### Multi-Model Comparison

```bash
# Set API keys
export ANTHROPIC_API_KEY=sk-...
export OPENAI_API_KEY=sk-...
export DEEPSEEK_API_KEY=sk-...

# Run comparison
npx ts-node src/tests/security/model-comparison.ts critical
```

### CI/CD

Security tests run automatically on:
- Pull requests to `main`
- Pushes to `main`
- Manual trigger via workflow dispatch

---

## 6. Incident Response

### If Leakage Detected

1. **Immediately** rotate any exposed secrets
2. Review CloudWatch logs for scope
3. Update system prompt to address vector
4. Add new test case for the attack
5. Deploy updated prompt

### If Jailbreak Succeeds

1. Document the exact prompt
2. Add to attack vectors test suite
3. Update system prompt with explicit refusal
4. Consider output validation rule
5. Test fix against similar variations

---

## 7. Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-21 | Initial security report |

---

## 8. Contact

For security concerns, contact:
- Email: security@photoscout.app (placeholder)
- GitHub Issues: [PhotoScout/issues](https://github.com/vbolshakov87/PhotoScout/issues)

---

*This report is auto-generated by the security testing suite. Run `pnpm test:security` to regenerate.*
