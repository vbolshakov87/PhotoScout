# PhotoScout Model Testing

Compare LLM models for the PhotoScout chat engine. Two test suites:

1. **Compliance Tests** - Instruction following, JSON output, security
2. **Quality Tests** - Photography spot knowledge quality

## Quick Start

```bash
cd model-testing
npm install

# Set API keys (only for models you want to test)
export ANTHROPIC_API_KEY="sk-..."
export OPENAI_API_KEY="sk-..."
export DEEPSEEK_API_KEY="sk-..."
export GEMINI_API_KEY="..."

# Run compliance tests
npm test

# Run quality tests (photography spot knowledge)
npm run quality

# Run everything
./quick-test.sh
```

## Models

| Tier | Model | Input $/1M | Output $/1M | API Key |
|------|-------|----------:|------------:|---------|
| Ultra-budget | GPT-4o Mini | $0.15 | $0.60 | `OPENAI_API_KEY` |
| Ultra-budget | DeepSeek V3.2 | $0.28 | $0.42 | `DEEPSEEK_API_KEY` |
| Ultra-budget | Gemini 3 Flash | $0.50 | $3.00 | `GEMINI_API_KEY` |
| Budget | Claude Haiku 3.5 | $0.80 | $4.00 | `ANTHROPIC_API_KEY` |
| Budget | Claude Haiku 4.5 | $1.00 | $5.00 | `ANTHROPIC_API_KEY` |
| Quality | GPT-5.2 | $1.75 | $14.00 | `OPENAI_API_KEY` |
| Quality | Claude Sonnet 4.5 | $3.00 | $15.00 | `ANTHROPIC_API_KEY` |

## Compliance Test Cases

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

## Quality Test Cases

Test photography spot quality - do models recommend real spots or generic tourist advice?

### Locations

| Location | Date | Good Spots | Red Flags |
|----------|------|------------|-----------|
| **Lofoten, Norway** | late September | Reine, Hamnøy, Kvalvika, Reinebringen, Sakrisøy | "visit lofoten", "beautiful scenery" |
| **Slovenia** | mid-October | Bled (sunrise!), Bohinj, Mangart, Vršič, Jasna | Postojna Cave, Ljubljana center |
| **Paris, France** | early May | Trocadéro, Bir-Hakeim, Montmartre, Pont Alexandre III | Champs-Élysées, Disneyland |

### Scoring (0-5)

| Score | Meaning |
|-------|---------|
| **Content Score (0-5)** | Quality of photography spots recommended |
| +1-3 pts | Good spots found (1-2 = +1, 3-4 = +2, 5+ = +3) |
| +1 pt | Timing info (sunrise/sunset/golden hour) |
| +1 pt | Coordinates included |
| -1 pt each | Red flags (generic tourist phrases) |

| Score | Meaning |
|-------|---------|
| **Format Score (0-3)** | JSON compliance |
| +1 pt | Valid JSON in response |
| +1 pt | JSON starts clean (no preamble text) |
| +1 pt | Has required fields (spots/dailySchedule) |

| Score | Meaning |
|-------|---------|
| **Date Score (0-1)** | Whether model reflects requested travel dates |

## Usage

```bash
# Compliance tests
npm test                          # Run on available models
npm test -- --model deepseek      # Specific model
npm test -- --case json-compliance # Specific test
npm test -- -v                    # Verbose output
npm test -- -p                    # Run models in parallel (faster)

# Quality tests
npm run quality                   # Run all quality tests
npm run quality -- --model haiku  # Specific model
npm run quality -- -l lofoten     # Specific location
npm run quality -- -r 2 -p        # 2 runs, parallel (recommended)

# Combined
./quick-test.sh                   # Run everything
./quick-test.sh quality           # Quality tests only
./quick-test.sh model haiku       # Test specific model (both suites)
```

## Results

Results are saved to `results/`:
- `compliance-results.json` - Compliance test results
- `compliance-report.html` - Compliance visual report
- `quality-results.json` - Quality test results with costs
- `quality-report.html` - Quality visual report
- `quality-report.md` - Quality report with scoring breakdown

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
