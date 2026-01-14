# Claude Code Task: Add Photography Quality Tests to PhotoScout

## Context

I'm building PhotoScout - a photography trip planning iOS app with AI chat. I have a model testing framework that tests 7 LLM models for instruction following, JSON compliance, and security.

Now I need to add **quality tests** that verify models recommend **real photography spots**, not generic tourist advice.

## Files to Update

The test suite is in `photoscout-model-test/` directory:
- `test-models.ts` - main test file
- `quick-test.sh` - bash testing script

## New Test: Photography Spot Quality

### Test Prompt (use for all 3 locations)
```
I want to photograph [LOCATION] for 3 days, focusing on landscapes and golden hour
```

### Three Test Locations

#### 1. Lofoten, Norway (remote/nature)

**Good photography spots to look for:**
- Reine viewpoint (specific angles)
- Hamnøy bridge (classic red cabins shot)
- Kvalvika Beach (requires hike)
- Unstad Beach (Arctic surfing)
- Reinebringen hike viewpoint
- Sakrisøy yellow cabins
- Specific coordinates for compositions

**Red flags (tourist trap answers):**
- Just "Visit Lofoten" without specifics
- Generic "beautiful scenery" descriptions
- No mention of timing (sunrise/sunset)
- Missing coordinates

#### 2. Slovenia (country-level)

**Good photography spots to look for:**
- Lake Bled island at sunrise (mention rowing boat for access!)
- Lake Bohinj (less crowded alternative to Bled)
- Mangart Pass viewpoints
- Julian Alps specific locations
- Jasna Lake with mountain reflections
- Škocjan Caves exterior/gorge
- Slap Savica waterfall
- Vršič Pass serpentines

**Red flags (tourist trap answers):**
- "Visit Lake Bled" without sunrise timing
- Postojna Cave (can't photograph inside properly)
- Ljubljana city center as main recommendation
- Generic "beautiful mountains"

#### 3. Paris, France (major city)

**Good photography spots to look for:**
- Trocadéro at sunrise (Eiffel Tower view)
- Bir-Hakeim bridge (Inception movie shot)
- Montmartre stairs at blue hour
- Pont Alexandre III
- Palais Royal columns (Colonnes de Buren)
- Sacré-Cœur viewpoint over Paris
- Le Marais streets (morning light)
- Louvre pyramid at night (less cliché angle)
- Pont des Arts
- Rue Crémieux (colorful houses)

**Red flags (tourist trap answers):**
- "See the Eiffel Tower" without specific viewpoint
- Champs-Élysées as photo spot
- Disneyland Paris
- No timing recommendations
- Only the most obvious spots without composition tips

## Scoring Rubric (0-5)

```typescript
// Score definitions
const QUALITY_SCORES = {
  0: "Generic tourist advice, no photo-specific spots",
  1: "Mentions 1-2 obvious spots without photo context",
  2: "Good spots but wrong timing/generic descriptions", 
  3: "Good spots + correct golden hour timing",
  4: "Great spots + timing + composition tips",
  5: "Hidden gems + specific viewpoints + photographer insights"
};
```

## Implementation Requirements

### 1. Add Quality Test Cases

Add 3 new test cases to the test suite:

```typescript
// Test case structure
interface QualityTest {
  name: string;
  location: string;
  prompt: string;
  goodSpots: string[];      // Keywords to look for (positive)
  redFlags: string[];       // Keywords that indicate tourist-trap answers
  mustHave: string[];       // Required elements (timing, coordinates, etc.)
}

const qualityTests: QualityTest[] = [
  {
    name: "Lofoten Photography Quality",
    location: "Lofoten, Norway",
    prompt: "I want to photograph Lofoten, Norway for 3 days, focusing on landscapes and golden hour",
    goodSpots: ["Reine", "Hamnøy", "Kvalvika", "Unstad", "Reinebringen", "Sakrisøy"],
    redFlags: ["visit lofoten", "beautiful scenery", "amazing views"],
    mustHave: ["sunrise", "sunset", "golden hour", "coordinates"]
  },
  {
    name: "Slovenia Photography Quality", 
    location: "Slovenia",
    prompt: "I want to photograph Slovenia for 3 days, focusing on landscapes and golden hour",
    goodSpots: ["Bled", "sunrise", "Bohinj", "Mangart", "Julian Alps", "Jasna", "Vršič"],
    redFlags: ["Postojna Cave", "Ljubljana center", "visit slovenia"],
    mustHave: ["sunrise", "sunset", "golden hour", "coordinates"]
  },
  {
    name: "Paris Photography Quality",
    location: "Paris, France", 
    prompt: "I want to photograph Paris for 3 days, focusing on cityscapes and golden hour",
    goodSpots: ["Trocadéro", "Bir-Hakeim", "Montmartre", "Pont Alexandre", "Palais Royal", "Sacré-Cœur"],
    redFlags: ["Champs-Élysées", "Disneyland", "see the eiffel tower"],
    mustHave: ["sunrise", "sunset", "blue hour", "coordinates"]
  }
];
```

### 2. Scoring Function

```typescript
function scoreQualityResponse(response: string, test: QualityTest): {
  score: number;
  goodSpotsFound: string[];
  redFlagsFound: string[];
  missingMustHave: string[];
  reasoning: string;
} {
  const responseLower = response.toLowerCase();
  
  const goodSpotsFound = test.goodSpots.filter(spot => 
    responseLower.includes(spot.toLowerCase())
  );
  
  const redFlagsFound = test.redFlags.filter(flag =>
    responseLower.includes(flag.toLowerCase())
  );
  
  const missingMustHave = test.mustHave.filter(item =>
    !responseLower.includes(item.toLowerCase())
  );
  
  // Calculate score
  let score = 0;
  
  // Base score from good spots (0-3 points)
  if (goodSpotsFound.length >= 4) score += 3;
  else if (goodSpotsFound.length >= 2) score += 2;
  else if (goodSpotsFound.length >= 1) score += 1;
  
  // Timing bonus (+1 point)
  if (missingMustHave.filter(m => 
    ["sunrise", "sunset", "golden hour", "blue hour"].includes(m)
  ).length === 0) {
    score += 1;
  }
  
  // Coordinates bonus (+1 point)
  if (!missingMustHave.includes("coordinates")) {
    score += 1;
  }
  
  // Red flag penalty (-1 per flag, min 0)
  score = Math.max(0, score - redFlagsFound.length);
  
  return {
    score: Math.min(5, score),
    goodSpotsFound,
    redFlagsFound,
    missingMustHave,
    reasoning: `Found ${goodSpotsFound.length} good spots, ${redFlagsFound.length} red flags, missing: ${missingMustHave.join(", ") || "none"}`
  };
}
```

### 3. Output Format

Generate a quality report table:

```
## Photography Quality Test Results

| Model | Lofoten | Slovenia | Paris | Avg | Notes |
|-------|:-------:|:--------:|:-----:|:---:|-------|
| GPT-5.2 | 5/5 | 4/5 | 5/5 | 4.7 | Best overall |
| Sonnet 4.5 | 4/5 | 4/5 | 4/5 | 4.0 | Consistent |
| Haiku 4.5 | 3/5 | 3/5 | 4/5 | 3.3 | Good value |
| Gemini 3 Flash | 4/5 | 4/5 | 4/5 | 4.0 | Google Maps advantage |
| GPT-4o Mini | 2/5 | 2/5 | 3/5 | 2.3 | Tourist-heavy |
| DeepSeek V3.2 | 2/5 | 2/5 | 3/5 | 2.3 | Basic spots only |
| Haiku 3.5 | 2/5 | 2/5 | 3/5 | 2.3 | Dated knowledge |

### Detailed Results

#### Lofoten, Norway
- GPT-5.2: Found [Reine, Hamnøy, Kvalvika, Reinebringen], timing ✓, coords ✓
- GPT-4o Mini: Found [Reine], red flags: ["beautiful scenery"], no coords
...
```

### 4. Updated Cost Estimate

Update the cost calculation to include 21 additional API calls (3 locations × 7 models):

```typescript
const QUALITY_TEST_TOKENS = {
  input: 2500,  // System prompt + quality prompt
  output: 1500  // Longer response expected for trip plans
};
```

## Expected Results

Based on model capabilities, here's what I expect:

| Model | Expected Score | Reasoning |
|-------|:--------------:|-----------|
| GPT-5.2 | 4-5 | Latest knowledge, best reasoning |
| Sonnet 4.5 | 4-5 | Strong general knowledge |
| Gemini 3 Flash | 4 | Google Maps data helps |
| Haiku 4.5 | 3-4 | Smaller but decent |
| GPT-4o Mini | 2-3 | May default to tourist spots |
| DeepSeek V3.2 | 2-3 | Weaker on niche travel |
| Haiku 3.5 | 2-3 | Older knowledge cutoff |

## Success Criteria

The quality tests help answer: **Is the 20x price difference worth it?**

- If cheap models (GPT-4o Mini, DeepSeek) score ≥3 → use them
- If only mid-tier (Haiku 4.5, Gemini Flash) score ≥3 → acceptable cost increase  
- If only expensive models (GPT-5.2, Sonnet) score well → need to build curated spots database instead

## Files to Create/Update

1. **Update `test-models.ts`**: Add quality tests, scoring function, report generation
2. **Update `quick-test.sh`**: Add quality test commands
3. **Create `quality-report.md`**: Output file for results
4. **Update cost estimates**: Include 21 additional calls

Run the tests and generate a comparison report showing which models give real photography advice vs generic tourist recommendations.
