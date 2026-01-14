# PhotoScout Launch Plan

**Domain:** https://aiscout.photo

## Product Overview

**PhotoScout** is an AI-powered photography trip planner that creates detailed, actionable shooting plans with specific locations, optimal timing, and minute-by-minute schedules.

**Target Audience:** Travel and landscape photographers planning photo trips

**Unique Value Proposition:**
- AI-generated plans with real coordinates and precise timing
- Minute-by-minute shooting schedules
- Difficulty levels and accessibility info
- Golden hour / blue hour optimization

---

## 💡 Founder's Story & Motivation

**Why I built PhotoScout:**

I'm Vladimir Bolshakov, a landscape and travel photographer. In 2024, a "professional" photo guide stole **€5,500** from me and canceled 2 trips at the last minute - leaving me without money AND without the photography experiences I'd been planning for months.

This wasn't just about money. It was the lost time, the shattered plans, and the realization that **photographers are vulnerable** when they depend on guides who may be unreliable, overpriced, or outright fraudulent.

**I built PhotoScout so photographers can:**
- Plan their own trips without depending on expensive guides
- Get the same quality location scouting that guides charge €500-2000 for
- Never be stranded by a canceled tour again
- Travel independently with confidence

**My mission:** Democratize photography trip planning. The best photo spots shouldn't be gatekept by expensive guides - they should be accessible to every photographer who's willing to wake up early and chase the light.

---

---

## Phase 1: Pre-Launch (Current)

### Technical Readiness

- [x] Core functionality (chat, plan generation)
- [x] iOS app
- [x] Web app with SEO
- [x] City image generation
- [x] Plan caching infrastructure
- [x] Custom domain (aiscout.photo)
- [x] SSL certificate via ACM
- [x] Security guardrails in prompts
- [x] Examples page with sample trips
- [ ] Update HTML template for daily schedule
- [ ] Add spot images to plans

### Analytics & Tracking

- [x] Google Analytics 4 setup (needs Measurement ID)
- [ ] Event tracking for key actions:
  - Plan generated
  - Plan viewed
  - Plan shared
  - Conversation started
- [ ] Conversion funnel tracking

### Content & Images

**Image Strategy Options:**

| Option | Quality | Cost | Speed |
|--------|---------|------|-------|
| Unsplash API | Good | Free | Fast |
| Google Imagen 3 | Excellent | ~$0.04/image | Medium |
| Midjourney | Excellent | $10-30/mo | Manual |
| Stock photos | Variable | $$ | Fast |

**Recommendation:** Use Unsplash API for spot images (free, real photos), keep Google Imagen for city hero images.

---

## Phase 2: Beta Testing

### Beta Channels

1. **Photography Communities**
   - Reddit: r/photography, r/landscapephotography, r/travel_photography
   - Facebook groups: Landscape Photography, Travel Photography
   - 500px community
   - Flickr groups

2. **Personal Network**
   - Photography friends
   - Travel bloggers
   - Instagram photographers

3. **Product Hunt (soft launch)**
   - Build anticipation
   - Get early feedback

### Beta Program Structure

**Duration:** 2-4 weeks

**Goals:**
- 50-100 beta users
- 200+ trip plans generated
- Qualitative feedback on usefulness
- Bug reports and UX issues

**Feedback Collection:**
- In-app feedback button
- Post-plan survey (1-5 rating + comments)
- User interviews (5-10 power users)

**Beta Invite Template:**
```
🎯 Calling landscape & travel photographers!

I built PhotoScout - an AI that creates detailed photo trip plans with:
- Exact coordinates & timing
- Minute-by-minute schedules
- Golden hour optimization
- Difficulty ratings

Looking for beta testers to try it before launch.

Free access + your feedback shapes the product.

Interested? [Link]
```

---

## Phase 3: Marketing & Launch

### Content Marketing

**Personal Story Angle (Viral Potential):**
- "A Photo Guide Stole €5,500 From Me - So I Built an AI to Replace Them"
- "Why I Stopped Booking Photo Tours (And What I Do Instead)"
- "The Real Cost of Photography Guides - Is It Worth It?"

**Educational Content:**
1. **Blog Posts / Medium Articles**
   - "How I Used AI to Plan My Dolomites Photo Trip"
   - "Golden Hour Timing: Why 30 Minutes Matters"
   - "Top 10 Photo Spots in [City] - AI-Curated"
   - "Planning Your First Solo Photo Trip (Without a Guide)"

2. **YouTube Videos**
   - Demo: "Planning a Tokyo Photo Trip in 2 Minutes"
   - Results: "I Followed an AI Photo Plan - Here's What Happened"
   - Story: "Why I Built PhotoScout After Getting Scammed"

3. **Instagram/TikTok**
   - Before/after: AI plan → actual photos
   - Time-lapse of trip following the schedule
   - Photo tips from generated plans
   - "POV: You planned your own photo trip with AI"

**Reddit Posts (High Engagement Potential):**
- r/photography: "I got scammed by a photo guide, so I built an AI alternative"
- r/solotravel: "How I plan photography trips without expensive guides"
- r/travel: "AI-powered trip planning for photographers"

### Launch Channels

| Channel | Timing | Expected Reach |
|---------|--------|----------------|
| Product Hunt | Day 1 | 5,000-20,000 |
| Hacker News | Day 1-2 | 2,000-10,000 |
| Reddit posts | Week 1 | 1,000-5,000 |
| Photography blogs | Week 1-2 | Variable |
| Newsletter features | Week 2-4 | Variable |

### SEO Strategy

**Target Keywords:**
- "photography trip planner"
- "photo spots [city]" (94 cities)
- "best photo locations [destination]"
- "golden hour photography planner"
- "landscape photography itinerary"

**Content Strategy:**
- Landing pages for top 20 destinations
- Blog posts targeting long-tail keywords
- User-generated content (shared plans)

---

## Phase 4: Monetization

### Business Models

**Option A: Freemium**
- Free: 3 plans/month, basic features
- Pro ($9.99/mo): Unlimited plans, advanced features
  - Export to PDF/GPX
  - Offline maps
  - Weather integration
  - Collaborative planning

**Option B: Partnership/White-Label**
- License to photography platforms
- Revenue share or flat fee
- See Partnership Strategy below

**Option C: Affiliate Revenue**
- Camera gear recommendations
- Travel booking links
- Photography workshop referrals

### Pricing Research

| Competitor | Price | Features |
|------------|-------|----------|
| PhotoPills | $10.99 (one-time) | Sun calculator, AR |
| The Photographer's Ephemeris | $9.99 (one-time) | Sun/moon positioning |
| PlanIt! | $9.99 (one-time) | AR scene planning |

**Insight:** Photographers pay for tools. One-time purchase is common in this space.

---

## Phase 5: Partnership Strategy

### Target Partners

**Priority 1: Location Scout Websites**

| Website | What They Have | What They're Missing | Contact |
|---------|---------------|---------------------|---------|
| **PhotoHound** (photohound.co) | Photo spot database, community | Trip planning, AI itineraries | Find via website |
| **LocationScout** (locationscout.net) | Location scouting for film/photo | Automated schedules | Find via website |
| **ShotHotspot** (shothotspot.com) | Photo locations database | Modern UX, planning tools | Find via website |
| **Photo Spots** (photo-spots.com) | Curated locations | Trip optimization | Find via website |
| **Really Good Photo Spots** (reallygoodphotospots.com) | Community spots | AI planning | Find via website |

**Why These Partners Make Sense:**
- They already have the audience (photographers looking for locations)
- They have location data we could enhance with AI planning
- They're missing the "what to do with these spots" layer
- Partnership could be: API integration, white-label, or revenue share

**Priority 2: Camera/Photography Brands**
- Canon, Sony, Nikon - companion app potential
- Peak Design, F-Stop - travel gear audience
- Photography magazines (PetaPixel, Fstoppers)

**Priority 3: Travel Companies**
- Lonely Planet, TripAdvisor - photography niche
- Airbnb Experiences - alternative to expensive guides
- Travel insurance companies - "plan your own trip" angle

### Partnership Pitch

**Email Template (Personal Story Version):**
```
Subject: I got scammed by a photo guide - so I built an AI to help photographers

Hi [Name],

I'm Vladimir, a landscape photographer from Germany. Last year, a "professional" photo guide stole €5,500 from me and canceled 2 trips. That experience pushed me to build PhotoScout - an AI that generates detailed photography trip plans so photographers can travel independently.

I noticed [Company] has an amazing location database, but photographers still need to figure out HOW to shoot these locations - timing, schedules, logistics.

PhotoScout could add that missing layer:
- AI-generated itineraries using your location data
- Minute-by-minute shooting schedules (wake up, travel, arrive, shoot)
- Golden hour / blue hour optimization
- Difficulty levels and accessibility info

My goal isn't to replace photo guides entirely - it's to help photographers who want to travel independently, especially those who can't afford €500-2000 guided tours.

Would you be open to a 15-minute call? I'd love to show you a demo.

Demo: https://aiscout.photo

Best,
Vladimir Bolshakov
Landscape photographer & builder of PhotoScout
https://vbolshakov.photo
```

**Email Template (Business Version):**
```
Subject: AI-powered planning layer for [Company] users

Hi [Name],

I'm Vladimir, a landscape photographer who built PhotoScout - an AI that generates detailed photography trip plans.

I noticed [Company] has an amazing [database/community/platform] but lacks automated trip planning.

PhotoScout could add:
- AI-generated itineraries using your location data
- Minute-by-minute shooting schedules
- Golden hour optimization
- Mobile-friendly trip plans

Would you be open to a 15-minute call to explore a partnership?

Demo: https://aiscout.photo

Best,
Vladimir
```

**Partnership Models:**

| Model | Structure | Revenue |
|-------|-----------|---------|
| White-label | They brand it | License fee |
| API Integration | We provide backend | Per-plan fee |
| Revenue Share | Joint product | 50/50 split |
| Acquisition | They buy it | Exit |

### Pitch Deck Outline

1. **Problem:** Photographers spend hours researching trips
2. **Solution:** AI-generated detailed plans in minutes
3. **Demo:** Live walkthrough
4. **Traction:** Beta metrics, user testimonials
5. **Market:** $X billion photography market
6. **Business Model:** [Chosen model]
7. **Partnership Opportunity:** How we work together
8. **Ask:** Partnership discussion / pilot program

---

## Immediate Action Items

### This Week (P0)

1. [ ] Get GA4 Measurement ID and update index.html
2. [ ] Update HTML template for daily schedule display
3. [ ] Test prompt v3 with real users
4. [ ] Set up feedback collection (simple form)

### Next Week (P1)

1. [ ] Add Unsplash API for spot images
2. [ ] Review image generation quality (Imagen 3)
3. [ ] Create 3 sample trip plans for marketing
4. [ ] Write first blog post

### Week 3-4 (P2)

1. [ ] Launch beta in 2-3 photography communities
2. [ ] Collect feedback and iterate
3. [ ] Prepare Product Hunt launch
4. [ ] Draft partnership emails

---

## Success Metrics

### Beta Phase
- 50+ beta users
- 200+ plans generated
- Average rating > 4.0/5
- 3+ testimonials

### Launch Phase
- 500+ users in first month
- 2,000+ plans generated
- 1+ partnership discussion
- Featured in 1+ photography blog

### Growth Phase
- 5,000+ monthly active users
- 10% conversion to paid (if freemium)
- Partnership deal signed
- App Store rating > 4.5

---

## Resources Needed

### Technical
- Custom domain (~$12/year)
- Unsplash API (free)
- Higher Imagen quota (if needed)

### Marketing
- Product Hunt launch prep
- Blog/Medium account
- Social media graphics

### Business
- Partnership pitch deck
- Demo video (2-3 min)
- One-pager PDF

---

## Timeline

```
Week 1-2:  Technical polish, feedback system
Week 3-4:  Beta launch, collect feedback
Week 5-6:  Iterate based on feedback
Week 7:    Product Hunt launch
Week 8+:   Partnership outreach, growth
```

---

## Notes

- Keep the product simple and focused
- Photographers value accuracy over features
- Real-world testing is essential (follow your own plans!)
- Partnership is likely the best monetization path
