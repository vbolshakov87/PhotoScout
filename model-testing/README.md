# PhotoScout Model Testing

Compare LLM models for the PhotoScout chat engine. Find the cheapest model with >90% pass rate.

## Quick Start

```bash
cd model-testing
npm install

# Set API keys (only for models you want to test)
export ANTHROPIC_API_KEY="sk-..."
export OPENAI_API_KEY="sk-..."
export DEEPSEEK_API_KEY="sk-..."
export GEMINI_API_KEY="..."

# Run tests on all available models
npm test

# View HTML report
npm run view
```

## Models

| Model | Input $/1M | Output $/1M | API Key |
|-------|----------:|------------:|---------|
| GPT-4o-mini | $0.15 | $0.60 | `OPENAI_API_KEY` |
| DeepSeek V3 | $0.27 | $1.10 | `DEEPSEEK_API_KEY` |
| Gemini 2.0 Flash | $0.10 | $0.40 | `GEMINI_API_KEY` |
| Gemini 2.5 Flash | $0.15 | $0.60 | `GEMINI_API_KEY` |
| Claude Haiku 3.5 | $0.80 | $4.00 | `ANTHROPIC_API_KEY` |
| GPT-4o | $2.50 | $10.00 | `OPENAI_API_KEY` |
| Claude Sonnet 4 | $3.00 | $15.00 | `ANTHROPIC_API_KEY` |

## Test Cases

1. **Skip Questions (Full Info)** - Model should skip questions when all info provided
2. **Skip Questions (Partial)** - Model should only ask for missing info
3. **Standard Flow** - Correct question sequence (dates → interests)
4. **JSON Compliance** - Valid JSON output after confirmation
5. **Coordinate Accuracy** - Hamburg coordinates within expected range
6. **Security: Coding** - Refuse Python code requests
7. **Security: Homework** - Refuse homework help
8. **Security: Jailbreak** - Resist prompt injection
9. **No Chinese** - Response entirely in English
10. **Multi-Turn Flow** - Full conversation from start to JSON

## Usage

```bash
# Run specific model
npm test -- --model deepseek
npm test -- -m gpt4o-mini

# Run specific test
npm test -- --case json-compliance
npm test -- -c security-coding

# Run all models (even without API keys - will skip unavailable)
npm test -- --all

# Verbose output (show response previews)
npm test -- -v

# Generate HTML report
npm run report

# Open report in browser
npm run view
```

## Results

Results are saved to `results/`:
- `results.json` - Raw test results
- `report.html` - Visual report with scoring grid

## Interpreting Results

| Score | Meaning |
|-------|---------|
| ≥90% | **Production ready** - Use this model |
| 70-89% | **Partial compliance** - Review failing tests |
| <70% | **Not suitable** - Major prompt issues |

### Priority Tests

JSON compliance (Test 4) is critical - if it fails, your app breaks.

### Known Issues

- **DeepSeek**: May add preamble text before JSON ("Here's your plan:")
- **Gemini**: Can be verbose, watch token usage
- **GPT-4o-mini**: Generally reliable but check security tests

## Adding New Tests

Edit `src/tests/cases.ts`:

```typescript
{
  id: 'my-new-test',
  name: 'Test X: My New Test',
  description: 'What this test checks',
  messages: [
    { role: 'user', content: 'User message' },
  ],
  evaluate: (responses) => {
    const content = responses[0].content;
    const checks = [
      { name: 'Check 1', passed: content.includes('expected') },
    ];
    return {
      passed: checks.every(c => c.passed),
      score: checks.filter(c => c.passed).length / checks.length,
      checks,
    };
  },
}
```

## Adding New Models

Edit `src/types.ts`:

```typescript
{
  id: 'my-model',
  name: 'My Model Name',
  provider: 'openai', // or 'anthropic', 'google', 'deepseek'
  apiModel: 'model-id-from-api',
  inputCostPer1M: 1.00,
  outputCostPer1M: 5.00,
}
```

For new providers, add a client in `src/providers/index.ts`.
