export interface TripPlan {
  city: string;
  title: string;
  subtitle: string;
  dates: string;
  mapCenter: { lat: number; lng: number };
  mapZoom: number;
  sunriseSunset: {
    sunrise: string;
    sunset: string;
    note: string;
  };
  shootingStrategy: string[];
  spots: Array<{
    number: number;
    name: string;
    lat: number;
    lng: number;
    priority: number;
    description: string;
    bestTime: string;
    tags: string[];
    distanceFromPrevious: string;
    parkingInfo: string;
    crowdLevel: string;
    accessibility: string;
    day?: number;
  }>;
  route: Array<{ lat: number; lng: number }>;
  practicalInfo: {
    totalDistance: string;
    estimatedTime: string;
    accommodation: string;
    transportation: string;
    weatherBackup: string;
  };
}

function calculateLightHours(sunrise: string, sunset: string) {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };

  const toTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const sunriseMin = toMinutes(sunrise);
  const sunsetMin = toMinutes(sunset);

  return {
    blueHourMorningStart: toTime(sunriseMin - 40),
    blueHourMorningEnd: toTime(sunriseMin - 10),
    goldenHourMorningStart: sunrise,
    goldenHourMorningEnd: toTime(sunriseMin + 60),
    goldenHourEveningStart: toTime(sunsetMin - 60),
    goldenHourEveningEnd: sunset,
    blueHourEveningStart: toTime(sunsetMin + 10),
    blueHourEveningEnd: toTime(sunsetMin + 40),
  };
}

function getSuggestedTime(bestTime: string, sunrise: string, sunset: string): string {
  const toMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const toTime = (mins: number) => {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };

  const sunriseMin = toMinutes(sunrise);
  const sunsetMin = toMinutes(sunset);
  const bt = bestTime.toLowerCase();

  if (bt.includes('sunrise') || bt.includes('dawn')) return toTime(sunriseMin - 30);
  if (bt.includes('blue hour') && bt.includes('morning')) return toTime(sunriseMin - 45);
  if (bt.includes('golden hour') && (bt.includes('morning') || bt.includes('am'))) return sunrise;
  if (bt.includes('morning')) return toTime(sunriseMin + 60);
  if (bt.includes('midday') || bt.includes('noon')) return '12:00';
  if (bt.includes('afternoon')) return '14:00';
  if (bt.includes('golden hour') || bt.includes('golden')) return toTime(sunsetMin - 60);
  if (bt.includes('sunset') || bt.includes('dusk')) return toTime(sunsetMin - 30);
  if (bt.includes('blue hour') && (bt.includes('evening') || bt.includes('pm'))) return toTime(sunsetMin + 10);
  if (bt.includes('night') || bt.includes('after dark')) return toTime(sunsetMin + 45);
  return sunrise;
}

function getFlickrSearchUrl(spotName: string, city: string): string {
  const query = encodeURIComponent(`${spotName} ${city} photography`);
  return `https://www.flickr.com/search/?text=${query}&sort=interestingness-desc`;
}

function getGoogleImagesUrl(spotName: string, city: string): string {
  const query = encodeURIComponent(`${spotName} ${city} photography`);
  return `https://www.google.com/search?tbm=isch&q=${query}`;
}

function getInstagramUrl(spotName: string): string {
  // Create hashtag from spot name: "Senso-ji Temple" -> "sensojitemple"
  const hashtag = spotName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return `https://www.instagram.com/explore/tags/${hashtag}/`;
}

function getGearSuggestions(tags: string[]): string[] {
  const gear: string[] = [];
  const tagStr = tags.join(' ').toLowerCase();

  if (tagStr.includes('wide') || tagStr.includes('architecture') || tagStr.includes('landscape')) {
    gear.push('Wide angle lens (16-35mm)');
  }
  if (tagStr.includes('portrait') || tagStr.includes('street')) {
    gear.push('Portrait lens (50-85mm)');
  }
  if (tagStr.includes('night') || tagStr.includes('long exposure') || tagStr.includes('blue hour')) {
    gear.push('Tripod');
  }
  if (tagStr.includes('night') || tagStr.includes('low light')) {
    gear.push('Fast lens (f/1.4-2.8)');
  }
  if (tagStr.includes('wildlife') || tagStr.includes('birds')) {
    gear.push('Telephoto lens (100-400mm)');
  }
  if (tagStr.includes('long exposure') || tagStr.includes('waterfall')) {
    gear.push('ND filters');
  }

  return gear.length > 0 ? gear : ['Standard zoom lens'];
}

function groupSpotsByDay(spots: TripPlan['spots']): Map<number, TripPlan['spots']> {
  const grouped = new Map<number, TripPlan['spots']>();
  spots.forEach(spot => {
    const day = spot.day || 1;
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(spot);
  });
  return grouped;
}

export function generateHTML(plan: TripPlan): string {
  const priorityLabel = (priority: number) => {
    switch (priority) {
      case 3: return { text: 'Must See', class: 'priority-high', icon: '🔥' };
      case 2: return { text: 'Recommended', class: 'priority-medium', icon: '⭐' };
      default: return { text: 'Optional', class: 'priority-low', icon: '💡' };
    }
  };

  const lightHours = calculateLightHours(plan.sunriseSunset.sunrise, plan.sunriseSunset.sunset);
  const spotsByDay = groupSpotsByDay(plan.spots);
  const days = Array.from(spotsByDay.keys()).sort((a, b) => a - b);
  const hasMultipleDays = days.length > 1;

  // Collect all unique gear
  const allGear = new Set<string>();
  plan.spots.forEach(spot => {
    getGearSuggestions(spot.tags).forEach(g => allGear.add(g));
  });

  const dayTabsHTML = hasMultipleDays ? `
    <div class="day-tabs">
      ${days.map((day, idx) => `
        <button class="day-tab ${idx === 0 ? 'active' : ''}" data-day="${day}">
          Day ${day}
          <span class="day-tab-count">${spotsByDay.get(day)!.length} spots</span>
        </button>
      `).join('')}
    </div>
  ` : '';

  const generateDayTimeline = (daySpots: TripPlan['spots'], day: number) => {
    const timelineItems = daySpots.map((spot) => {
      const suggestedTime = getSuggestedTime(spot.bestTime, plan.sunriseSunset.sunrise, plan.sunriseSunset.sunset);
      const priority = priorityLabel(spot.priority);
      return `
      <div class="timeline-item" data-spot="${spot.number}" data-time="${suggestedTime}">
        <div class="timeline-time">${suggestedTime}</div>
        <div class="timeline-dot ${spot.priority === 3 ? 'high' : spot.priority === 2 ? 'medium' : 'low'}"></div>
        <div class="timeline-content">
          <div class="timeline-name">${priority.icon} ${spot.name}</div>
          <div class="timeline-meta">${spot.bestTime}</div>
        </div>
        <label class="timeline-check">
          <input type="checkbox" data-spot-check="${spot.number}">
          <span class="checkmark">✓</span>
        </label>
      </div>`;
    }).join('\n');

    return `
    <div class="day-schedule" data-day="${day}" ${hasMultipleDays && day !== days[0] ? 'style="display:none"' : ''}>
      <details class="collapsible" open>
        <summary class="collapsible-header">
          <span>📅 ${hasMultipleDays ? `Day ${day}` : 'Schedule'}</span>
          <span class="collapse-icon">▼</span>
        </summary>
        <div class="collapsible-content">
          ${timelineItems}
        </div>
      </details>
    </div>`;
  };

  const timelinesHTML = days.map(day => generateDayTimeline(spotsByDay.get(day)!, day)).join('\n');

  const generateSpotCard = (spot: TripPlan['spots'][0]) => {
    const priority = priorityLabel(spot.priority);
    const suggestedTime = getSuggestedTime(spot.bestTime, plan.sunriseSunset.sunrise, plan.sunriseSunset.sunset);
    const flickrUrl = getFlickrSearchUrl(spot.name, plan.city);
    const googleImagesUrl = getGoogleImagesUrl(spot.name, plan.city);
    const instagramUrl = getInstagramUrl(spot.name);
    const day = spot.day || 1;
    const gear = getGearSuggestions(spot.tags);

    return `
    <div class="spot" id="spot-${spot.number}" data-day="${day}" data-time="${suggestedTime}">
      <details class="collapsible" open>
        <summary class="spot-header">
          <label class="spot-check" onclick="event.stopPropagation()">
            <input type="checkbox" data-spot-check="${spot.number}">
            <span class="checkmark">✓</span>
          </label>
          <div class="spot-title">
            <h3>${priority.icon} ${spot.name}</h3>
            <div class="spot-badges">
              <span class="badge ${priority.class}">${priority.text}</span>
              <span class="badge time-badge">🕐 ${suggestedTime}</span>
            </div>
          </div>
          <span class="collapse-icon">▼</span>
        </summary>
        <div class="collapsible-content">
          <div class="photo-links">
            <a href="${flickrUrl}" target="_blank" class="photo-link">
              <span class="photo-link-icon">📷</span>
              <span>Flickr</span>
            </a>
            <a href="${googleImagesUrl}" target="_blank" class="photo-link">
              <span class="photo-link-icon">🔍</span>
              <span>Google</span>
            </a>
            <a href="${instagramUrl}" target="_blank" class="photo-link">
              <span class="photo-link-icon">📸</span>
              <span>Instagram</span>
            </a>
          </div>

          <p class="spot-desc">${spot.description}</p>

          <div class="spot-meta-grid">
            <div class="meta-item">
              <span class="meta-icon">🕐</span>
              <span class="meta-label">Best Time</span>
              <span class="meta-value">${spot.bestTime}</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">📍</span>
              <span class="meta-label">Distance</span>
              <span class="meta-value">${spot.distanceFromPrevious}</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">👥</span>
              <span class="meta-label">Crowds</span>
              <span class="meta-value">${spot.crowdLevel}</span>
            </div>
            <div class="meta-item">
              <span class="meta-icon">🅿️</span>
              <span class="meta-label">Parking</span>
              <span class="meta-value">${spot.parkingInfo}</span>
            </div>
          </div>

          <div class="gear-section">
            <div class="gear-title">📷 Suggested Gear</div>
            <div class="gear-list">
              ${gear.map(g => `<span class="gear-tag">${g}</span>`).join('')}
            </div>
          </div>

          <div class="spot-tags">${spot.tags.map(t => `<span class="tag">${t}</span>`).join('')}</div>

          <div class="spot-actions">
            <a href="https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}" target="_blank" class="btn btn-primary">
              <span>📍</span> Navigate
            </a>
            <a href="https://www.google.com/maps/search/?api=1&query=${spot.lat},${spot.lng}" target="_blank" class="btn">
              <span>🗺️</span> View Map
            </a>
          </div>
        </div>
      </details>
    </div>`;
  };

  const spotsHTML = hasMultipleDays
    ? days.map(day => `
        <div class="day-spots" data-day="${day}" ${day !== days[0] ? 'style="display:none"' : ''}>
          ${spotsByDay.get(day)!.map(generateSpotCard).join('\n')}
        </div>
      `).join('\n')
    : plan.spots.map(generateSpotCard).join('\n');

  const routeCoords = plan.route.map(r => `[${r.lat}, ${r.lng}]`).join(',');
  const markerData = plan.spots.map(s =>
    `{lat:${s.lat},lng:${s.lng},num:${s.number},name:"${s.name.replace(/"/g, '\\"')}",priority:${s.priority},day:${s.day || 1}}`
  ).join(',');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="theme-color" content="#ffffff">
    <title>${plan.title} | PhotoScout</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        :root {
            --bg: #ffffff;
            --bg-secondary: #f8f9fa;
            --bg-card: #ffffff;
            --text: #1a1a1a;
            --text-secondary: #666;
            --text-muted: #999;
            --border: #e5e5e5;
            --accent: #1a1a1a;
            --accent-light: #f5f5f5;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #dc2626;
            --blue: #3b82f6;
            --gold: #d97706;
        }

        .dark {
            --bg: #0f0f0f;
            --bg-secondary: #1a1a1a;
            --bg-card: #1f1f1f;
            --text: #ffffff;
            --text-secondary: #a0a0a0;
            --text-muted: #666;
            --border: #333;
            --accent: #ffffff;
            --accent-light: #2a2a2a;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.5;
            font-size: 15px;
            transition: background 0.3s, color 0.3s;
        }

        /* Sticky Light Bar */
        .light-bar {
            position: sticky;
            top: 0;
            z-index: 100;
            background: linear-gradient(135deg, #fef3c7, #fde68a);
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.8rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        }

        .dark .light-bar {
            background: linear-gradient(135deg, #78350f, #92400e);
            color: #fef3c7;
        }

        .light-bar-item {
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .light-bar-time {
            font-weight: 700;
        }

        .current-time {
            background: var(--accent);
            color: var(--bg);
            padding: 2px 8px;
            border-radius: 4px;
            font-weight: 600;
            font-size: 0.75rem;
        }

        /* Header */
        .header {
            padding: 16px 12px;
            background: var(--bg);
            border-bottom: 1px solid var(--border);
        }

        .header h1 {
            font-size: 1.25rem;
            font-weight: 700;
            margin-bottom: 4px;
            color: var(--text);
        }

        .header-sub {
            font-size: 0.75rem;
            color: var(--text-secondary);
        }

        /* Controls */
        .controls {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background: var(--bg-secondary);
            border-bottom: 1px solid var(--border);
        }

        .control-btn {
            padding: 6px 12px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 0.75rem;
            cursor: pointer;
            display: flex;
            align-items: center;
            gap: 4px;
            color: var(--text);
        }

        .control-btn:hover {
            background: var(--accent-light);
        }

        .progress-bar {
            flex: 1;
            margin: 0 12px;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .progress-track {
            flex: 1;
            height: 6px;
            background: var(--border);
            border-radius: 3px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: var(--success);
            width: 0%;
            transition: width 0.3s;
        }

        .progress-text {
            font-size: 0.7rem;
            color: var(--text-secondary);
            white-space: nowrap;
        }

        /* Main */
        .main {
            max-width: 600px;
            margin: 0 auto;
            padding: 12px;
        }

        /* Quick Info */
        .quick-info {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 8px;
            margin-bottom: 12px;
        }

        .quick-info-item {
            text-align: center;
            padding: 10px;
            background: var(--bg-secondary);
            border-radius: 8px;
        }

        .quick-info-item strong {
            display: block;
            font-size: 1.1rem;
        }

        .quick-info-item span {
            font-size: 0.65rem;
            color: var(--text-secondary);
            text-transform: uppercase;
        }

        /* Light Card */
        .light-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 12px;
            overflow: hidden;
        }

        .light-hours {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 1px;
            background: var(--border);
        }

        .light-hour {
            padding: 10px;
            background: var(--bg-card);
            text-align: center;
        }

        .light-hour .name {
            font-size: 0.6rem;
            color: var(--text-muted);
            text-transform: uppercase;
            margin-bottom: 2px;
        }

        .light-hour .time {
            font-weight: 600;
            font-size: 0.85rem;
        }

        .light-hour.blue { background: #eff6ff; }
        .light-hour.blue .time { color: var(--blue); }
        .light-hour.golden { background: #fffbeb; }
        .light-hour.golden .time { color: var(--gold); }

        .dark .light-hour.blue { background: #1e3a5f; }
        .dark .light-hour.golden { background: #78350f; }

        /* Day Tabs */
        .day-tabs {
            display: flex;
            gap: 6px;
            margin-bottom: 12px;
            overflow-x: auto;
            -webkit-overflow-scrolling: touch;
            padding-bottom: 4px;
        }

        .day-tab {
            flex: 1;
            min-width: 70px;
            padding: 8px 10px;
            border: 1px solid var(--border);
            border-radius: 8px;
            background: var(--bg-card);
            font-size: 0.8rem;
            font-weight: 600;
            cursor: pointer;
            text-align: center;
            color: var(--text);
        }

        .day-tab.active {
            background: var(--accent);
            color: var(--bg);
            border-color: var(--accent);
        }

        .day-tab-count {
            display: block;
            font-size: 0.6rem;
            font-weight: 400;
            opacity: 0.7;
        }

        /* Collapsible */
        .collapsible { border: none; }
        .collapsible summary { list-style: none; cursor: pointer; }
        .collapsible summary::-webkit-details-marker { display: none; }

        .collapsible-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 12px;
            background: var(--bg-secondary);
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.85rem;
        }

        .collapse-icon {
            font-size: 0.65rem;
            color: var(--text-muted);
            transition: transform 0.2s;
        }

        .collapsible[open] .collapse-icon { transform: rotate(180deg); }
        .collapsible-content { padding-top: 8px; }

        /* Timeline */
        .day-schedule { margin-bottom: 12px; }

        .timeline-item {
            display: grid;
            grid-template-columns: 45px 14px 1fr 30px;
            gap: 8px;
            align-items: center;
            padding: 8px 4px;
            border-radius: 6px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .timeline-item:hover { background: var(--accent-light); }
        .timeline-item.now { background: #fef3c7; }
        .dark .timeline-item.now { background: #78350f; }
        .timeline-item.done { opacity: 0.5; }
        .timeline-item.done .timeline-name { text-decoration: line-through; }

        .timeline-time {
            font-weight: 600;
            font-size: 0.75rem;
            text-align: right;
        }

        .timeline-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
            background: var(--text-muted);
        }

        .timeline-dot.high { background: var(--danger); }
        .timeline-dot.medium { background: var(--warning); }

        .timeline-content { min-width: 0; }
        .timeline-name { font-size: 0.8rem; font-weight: 500; }
        .timeline-meta { font-size: 0.65rem; color: var(--text-secondary); }

        .timeline-check, .spot-check {
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .timeline-check input, .spot-check input {
            display: none;
        }

        .checkmark {
            width: 22px;
            height: 22px;
            border: 2px solid var(--border);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.7rem;
            color: transparent;
            transition: all 0.2s;
        }

        input:checked + .checkmark {
            background: var(--success);
            border-color: var(--success);
            color: white;
        }

        /* Section */
        .section { margin-bottom: 16px; }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 10px;
        }

        .section-title {
            font-size: 0.85rem;
            font-weight: 600;
        }

        .section-actions {
            display: flex;
            gap: 6px;
        }

        .small-btn {
            padding: 4px 8px;
            font-size: 0.65rem;
            background: var(--bg-secondary);
            border: 1px solid var(--border);
            border-radius: 4px;
            cursor: pointer;
            color: var(--text);
        }

        /* Map */
        #map {
            height: 200px;
            border-radius: 8px;
            margin-bottom: 8px;
        }

        .map-link {
            display: block;
            text-align: center;
            padding: 10px;
            background: var(--accent);
            color: var(--bg);
            text-decoration: none;
            border-radius: 8px;
            font-weight: 500;
            font-size: 0.8rem;
        }

        /* Spots */
        .spot {
            border: 1px solid var(--border);
            border-radius: 8px;
            margin-bottom: 10px;
            overflow: hidden;
            background: var(--bg-card);
        }

        .spot.done { opacity: 0.6; }
        .spot.now { border-color: var(--warning); box-shadow: 0 0 0 2px rgba(245, 158, 11, 0.2); }

        .spot-header {
            display: flex;
            gap: 8px;
            align-items: center;
            padding: 10px;
            background: var(--bg-card);
        }

        .spot-header:hover { background: var(--accent-light); }

        .spot-title { flex: 1; min-width: 0; }

        .spot-title h3 {
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 2px;
        }

        .spot-badges { display: flex; flex-wrap: wrap; gap: 4px; }

        .badge {
            display: inline-block;
            padding: 2px 6px;
            border-radius: 4px;
            font-size: 0.55rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .priority-high { background: #fee2e2; color: var(--danger); }
        .priority-medium { background: #fef3c7; color: var(--gold); }
        .priority-low { background: var(--bg-secondary); color: var(--text-muted); }
        .time-badge { background: #dbeafe; color: var(--blue); }

        .dark .priority-high { background: #7f1d1d; }
        .dark .priority-medium { background: #78350f; }
        .dark .time-badge { background: #1e3a5f; }

        .spot .collapsible-content { padding: 0 10px 10px; }
        .spot .collapse-icon { flex-shrink: 0; }

        /* Photo Links */
        .photo-links {
            display: flex;
            gap: 6px;
            margin-bottom: 10px;
        }

        .photo-link {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 2px;
            padding: 10px 6px;
            background: var(--bg-secondary);
            border-radius: 6px;
            text-decoration: none;
            color: var(--text-secondary);
            font-size: 0.65rem;
            transition: background 0.2s;
        }

        .photo-link:hover {
            background: var(--accent-light);
            color: var(--text);
        }

        .photo-link-icon { font-size: 1rem; }

        .spot-desc {
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-bottom: 10px;
            line-height: 1.5;
        }

        /* Meta Grid */
        .spot-meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
            margin-bottom: 10px;
        }

        .meta-item {
            padding: 8px;
            background: var(--bg-secondary);
            border-radius: 6px;
        }

        .meta-icon { font-size: 0.9rem; }
        .meta-label { font-size: 0.55rem; color: var(--text-muted); text-transform: uppercase; display: block; }
        .meta-value { font-size: 0.7rem; font-weight: 500; }

        /* Gear Section */
        .gear-section {
            margin-bottom: 10px;
            padding: 8px;
            background: var(--bg-secondary);
            border-radius: 6px;
        }

        .gear-title {
            font-size: 0.65rem;
            font-weight: 600;
            margin-bottom: 6px;
            text-transform: uppercase;
            color: var(--text-secondary);
        }

        .gear-list { display: flex; flex-wrap: wrap; gap: 4px; }

        .gear-tag {
            padding: 3px 8px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 4px;
            font-size: 0.65rem;
        }

        .spot-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }

        .tag {
            padding: 2px 6px;
            background: var(--accent-light);
            border-radius: 4px;
            font-size: 0.65rem;
            color: var(--text-secondary);
        }

        .spot-actions { display: flex; gap: 6px; }

        .btn {
            flex: 1;
            padding: 10px;
            text-align: center;
            text-decoration: none;
            border-radius: 6px;
            font-weight: 500;
            font-size: 0.75rem;
            border: 1px solid var(--border);
            color: var(--text);
            background: var(--bg-card);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }

        .btn-primary {
            background: var(--accent);
            color: var(--bg);
            border-color: var(--accent);
        }

        /* Tips & Info */
        .tips-list { list-style: none; }

        .tips-list li {
            padding: 8px 0;
            border-bottom: 1px solid var(--border);
            font-size: 0.8rem;
            display: flex;
            align-items: flex-start;
            gap: 8px;
        }

        .tips-list li:last-child { border-bottom: none; }

        .info-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 6px;
        }

        .info-item {
            padding: 10px;
            background: var(--bg-secondary);
            border-radius: 6px;
        }

        .info-item .label {
            font-size: 0.6rem;
            color: var(--text-muted);
            text-transform: uppercase;
        }

        .info-item .value {
            font-size: 0.8rem;
            font-weight: 500;
        }

        /* Gear Checklist */
        .gear-checklist {
            background: var(--bg-secondary);
            border-radius: 8px;
            padding: 12px;
            margin-bottom: 12px;
        }

        .gear-checklist-title {
            font-size: 0.85rem;
            font-weight: 600;
            margin-bottom: 8px;
        }

        .gear-checklist-items {
            display: flex;
            flex-wrap: wrap;
            gap: 6px;
        }

        .gear-checklist-item {
            padding: 6px 10px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 6px;
            font-size: 0.7rem;
            cursor: pointer;
        }

        .gear-checklist-item.checked {
            background: var(--success);
            color: white;
            border-color: var(--success);
        }

        /* Footer */
        .footer {
            text-align: center;
            padding: 16px;
            font-size: 0.65rem;
            color: var(--text-muted);
            border-top: 1px solid var(--border);
            margin-top: 16px;
        }

        .footer a { color: var(--text-secondary); }

        /* FAB */
        .fab {
            position: fixed;
            bottom: 20px;
            right: 20px;
            width: 48px;
            height: 48px;
            background: var(--accent);
            color: var(--bg);
            border: none;
            border-radius: 50%;
            font-size: 1.2rem;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            z-index: 1000;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .fab-menu {
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            z-index: 1000;
            display: none;
        }

        .fab-menu.show { display: block; }

        .fab-menu-item {
            display: block;
            padding: 8px 12px;
            font-size: 0.75rem;
            color: var(--text);
            text-decoration: none;
            border-radius: 4px;
            white-space: nowrap;
        }

        .fab-menu-item:hover { background: var(--accent-light); }

        /* Map Markers */
        .marker {
            background: var(--accent);
            border: 2px solid var(--bg);
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 11px;
            color: var(--bg);
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
        }

        .marker.high { background: var(--danger); }
        .marker.medium { background: var(--warning); }
        .marker.low { background: var(--text-muted); }

        /* Print */
        @media print {
            .light-bar, .controls, .fab, .fab-menu { display: none !important; }
            .spot details { open: true; }
            .spot { break-inside: avoid; }
        }
    </style>
</head>
<body>
    <!-- Sticky Light Bar -->
    <div class="light-bar">
        <div class="light-bar-item">
            <span>🌅</span>
            <span class="light-bar-time">${plan.sunriseSunset.sunrise}</span>
        </div>
        <div class="light-bar-item">
            <span>🌇</span>
            <span class="light-bar-time">${plan.sunriseSunset.sunset}</span>
        </div>
        <div class="current-time" id="currentTime">--:--</div>
    </div>

    <header class="header">
        <h1>${plan.title}</h1>
        <p class="header-sub">${plan.subtitle} · ${plan.dates}</p>
    </header>

    <!-- Controls -->
    <div class="controls">
        <button class="control-btn" onclick="toggleDarkMode()">
            <span id="darkModeIcon">🌙</span>
        </button>
        <div class="progress-bar">
            <div class="progress-track">
                <div class="progress-fill" id="progressFill"></div>
            </div>
            <span class="progress-text" id="progressText">0/${plan.spots.length}</span>
        </div>
        <button class="control-btn" onclick="window.print()">🖨️</button>
    </div>

    <main class="main">
        <!-- Quick Info -->
        <div class="quick-info">
            <div class="quick-info-item">
                <strong>${plan.spots.length}</strong>
                <span>Spots</span>
            </div>
            <div class="quick-info-item">
                <strong>${plan.practicalInfo.estimatedTime}</strong>
                <span>Duration</span>
            </div>
            <div class="quick-info-item">
                <strong>${plan.spots.filter(s => s.priority === 3).length}</strong>
                <span>Must-See</span>
            </div>
        </div>

        <!-- Light Times -->
        <div class="light-card">
            <div class="light-hours">
                <div class="light-hour blue">
                    <div class="name">Blue AM</div>
                    <div class="time">${lightHours.blueHourMorningStart}-${lightHours.blueHourMorningEnd}</div>
                </div>
                <div class="light-hour golden">
                    <div class="name">Golden AM</div>
                    <div class="time">${lightHours.goldenHourMorningStart}-${lightHours.goldenHourMorningEnd}</div>
                </div>
                <div class="light-hour golden">
                    <div class="name">Golden PM</div>
                    <div class="time">${lightHours.goldenHourEveningStart}-${lightHours.goldenHourEveningEnd}</div>
                </div>
                <div class="light-hour blue">
                    <div class="name">Blue PM</div>
                    <div class="time">${lightHours.blueHourEveningStart}-${lightHours.blueHourEveningEnd}</div>
                </div>
            </div>
        </div>

        <!-- Gear Checklist -->
        <div class="gear-checklist">
            <div class="gear-checklist-title">📷 Gear Checklist</div>
            <div class="gear-checklist-items">
                ${Array.from(allGear).map(g => `<div class="gear-checklist-item" onclick="this.classList.toggle('checked')">${g}</div>`).join('')}
            </div>
        </div>

        <!-- Day Tabs -->
        ${dayTabsHTML}

        <!-- Schedule -->
        ${timelinesHTML}

        <!-- Map -->
        <section class="section">
            <div class="section-header">
                <h2 class="section-title">📍 Route</h2>
            </div>
            <div id="map"></div>
            <a href="https://www.google.com/maps/dir/${plan.spots.map(s => `${s.lat},${s.lng}`).join('/')}" target="_blank" class="map-link">
                Open in Google Maps
            </a>
        </section>

        <!-- Spots -->
        <section class="section">
            <div class="section-header">
                <h2 class="section-title">📸 Photo Spots</h2>
                <div class="section-actions">
                    <button class="small-btn" onclick="expandAll()">Expand</button>
                    <button class="small-btn" onclick="collapseAll()">Collapse</button>
                </div>
            </div>
            ${spotsHTML}
        </section>

        <!-- Tips -->
        <section class="section">
            <h2 class="section-title" style="margin-bottom: 10px;">💡 Pro Tips</h2>
            <ul class="tips-list">
                ${plan.shootingStrategy.map(tip => `<li><span>✓</span> ${tip}</li>`).join('')}
            </ul>
        </section>

        <!-- Practical Info -->
        <section class="section">
            <h2 class="section-title" style="margin-bottom: 10px;">📋 Practical Info</h2>
            <div class="info-grid">
                <div class="info-item">
                    <div class="label">Distance</div>
                    <div class="value">${plan.practicalInfo.totalDistance}</div>
                </div>
                <div class="info-item">
                    <div class="label">Transport</div>
                    <div class="value">${plan.practicalInfo.transportation}</div>
                </div>
                <div class="info-item">
                    <div class="label">Stay</div>
                    <div class="value">${plan.practicalInfo.accommodation}</div>
                </div>
                <div class="info-item">
                    <div class="label">Rain Plan</div>
                    <div class="value">${plan.practicalInfo.weatherBackup}</div>
                </div>
            </div>
        </section>
    </main>

    <footer class="footer">
        Created with <a href="https://d2mpt2trz11kx7.cloudfront.net">PhotoScout</a>
    </footer>

    <!-- FAB -->
    <button class="fab" onclick="toggleFabMenu()">☰</button>
    <div class="fab-menu" id="fabMenu">
        <a href="#" class="fab-menu-item" onclick="scrollToTop()">⬆️ Top</a>
        <a href="#map" class="fab-menu-item">🗺️ Map</a>
        <a href="#" class="fab-menu-item" onclick="scrollToNextSpot()">➡️ Next Spot</a>
        <a href="#" class="fab-menu-item" onclick="resetProgress()">🔄 Reset</a>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
        // State
        const STORAGE_KEY = 'photoscout-${plan.city.toLowerCase().replace(/\\s+/g, '-')}';
        let checkedSpots = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
        let fabOpen = false;

        // Init
        function init() {
            updateClock();
            setInterval(updateClock, 1000);
            loadProgress();
            updateProgress();
            highlightCurrentSpot();

            // Restore dark mode
            if (localStorage.getItem('darkMode') === 'true') {
                document.body.classList.add('dark');
                document.getElementById('darkModeIcon').textContent = '☀️';
            }
        }

        // Clock
        function updateClock() {
            const now = new Date();
            document.getElementById('currentTime').textContent =
                now.getHours().toString().padStart(2, '0') + ':' +
                now.getMinutes().toString().padStart(2, '0');
        }

        // Dark mode
        function toggleDarkMode() {
            document.body.classList.toggle('dark');
            const isDark = document.body.classList.contains('dark');
            localStorage.setItem('darkMode', isDark);
            document.getElementById('darkModeIcon').textContent = isDark ? '☀️' : '🌙';
        }

        // Progress
        function loadProgress() {
            checkedSpots.forEach(num => {
                document.querySelectorAll(\`[data-spot-check="\${num}"]\`).forEach(cb => {
                    cb.checked = true;
                });
                const spot = document.getElementById('spot-' + num);
                if (spot) spot.classList.add('done');
                document.querySelectorAll(\`.timeline-item[data-spot="\${num}"]\`).forEach(item => {
                    item.classList.add('done');
                });
            });
        }

        function updateProgress() {
            const total = ${plan.spots.length};
            const done = checkedSpots.length;
            document.getElementById('progressFill').style.width = (done / total * 100) + '%';
            document.getElementById('progressText').textContent = done + '/' + total;
        }

        function saveProgress() {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(checkedSpots));
        }

        function resetProgress() {
            checkedSpots = [];
            saveProgress();
            location.reload();
        }

        // Checkbox handlers
        document.querySelectorAll('[data-spot-check]').forEach(cb => {
            cb.addEventListener('change', (e) => {
                const num = parseInt(e.target.dataset.spotCheck);
                if (e.target.checked) {
                    if (!checkedSpots.includes(num)) checkedSpots.push(num);
                } else {
                    checkedSpots = checkedSpots.filter(n => n !== num);
                }

                // Sync all checkboxes for this spot
                document.querySelectorAll(\`[data-spot-check="\${num}"]\`).forEach(other => {
                    other.checked = e.target.checked;
                });

                // Update visual state
                const spot = document.getElementById('spot-' + num);
                if (spot) spot.classList.toggle('done', e.target.checked);
                document.querySelectorAll(\`.timeline-item[data-spot="\${num}"]\`).forEach(item => {
                    item.classList.toggle('done', e.target.checked);
                });

                saveProgress();
                updateProgress();
            });
        });

        // Highlight current spot
        function highlightCurrentSpot() {
            const now = new Date();
            const currentMins = now.getHours() * 60 + now.getMinutes();

            let nextSpot = null;
            let minDiff = Infinity;

            document.querySelectorAll('.timeline-item').forEach(item => {
                const time = item.dataset.time;
                if (!time) return;
                const [h, m] = time.split(':').map(Number);
                const spotMins = h * 60 + m;
                const diff = spotMins - currentMins;

                if (diff >= -30 && diff < minDiff) {
                    minDiff = diff;
                    nextSpot = item.dataset.spot;
                }
            });

            if (nextSpot) {
                document.querySelectorAll(\`.timeline-item[data-spot="\${nextSpot}"]\`).forEach(item => {
                    item.classList.add('now');
                });
                const spot = document.getElementById('spot-' + nextSpot);
                if (spot) spot.classList.add('now');
            }
        }

        // Day tabs
        document.querySelectorAll('.day-tab').forEach(tab => {
            tab.addEventListener('click', () => {
                const day = tab.dataset.day;
                document.querySelectorAll('.day-tab').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('.day-schedule').forEach(s => {
                    s.style.display = s.dataset.day === day ? 'block' : 'none';
                });
                document.querySelectorAll('.day-spots').forEach(s => {
                    s.style.display = s.dataset.day === day ? 'block' : 'none';
                });
            });
        });

        // Timeline click
        document.querySelectorAll('.timeline-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.type === 'checkbox' || e.target.classList.contains('checkmark')) return;
                const spotNum = item.dataset.spot;
                const spotEl = document.getElementById('spot-' + spotNum);
                if (spotEl) {
                    spotEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    const details = spotEl.querySelector('details');
                    if (details) details.open = true;
                }
            });
        });

        // Expand/Collapse
        function expandAll() {
            document.querySelectorAll('.spot details').forEach(d => d.open = true);
        }
        function collapseAll() {
            document.querySelectorAll('.spot details').forEach(d => d.open = false);
        }

        // FAB
        function toggleFabMenu() {
            fabOpen = !fabOpen;
            document.getElementById('fabMenu').classList.toggle('show', fabOpen);
        }

        function scrollToTop() {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            toggleFabMenu();
        }

        function scrollToNextSpot() {
            const unchecked = ${JSON.stringify(plan.spots.map(s => s.number))}.find(n => !checkedSpots.includes(n));
            if (unchecked) {
                const el = document.getElementById('spot-' + unchecked);
                if (el) {
                    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    el.querySelector('details').open = true;
                }
            }
            toggleFabMenu();
        }

        // Map
        const map = L.map('map', { scrollWheelZoom: false })
            .setView([${plan.mapCenter.lat}, ${plan.mapCenter.lng}], ${plan.mapZoom});

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OSM',
            maxZoom: 19
        }).addTo(map);

        const markers = [${markerData}];
        markers.forEach(m => {
            const cls = m.priority === 3 ? 'high' : m.priority === 2 ? 'medium' : 'low';
            const icon = L.divIcon({
                className: 'marker ' + cls,
                html: m.num,
                iconSize: [24, 24],
                iconAnchor: [12, 12]
            });
            L.marker([m.lat, m.lng], { icon })
                .addTo(map)
                .bindPopup('<b>' + m.name + '</b><br><a href="#spot-' + m.num + '">View</a>');
        });

        const route = [${routeCoords}];
        L.polyline(route, { color: '#1a1a1a', weight: 2, opacity: 0.6, dashArray: '6,6' }).addTo(map);
        if (route.length > 0) map.fitBounds(route, { padding: [30, 30] });

        // Close FAB on outside click
        document.addEventListener('click', (e) => {
            if (fabOpen && !e.target.closest('.fab') && !e.target.closest('.fab-menu')) {
                fabOpen = false;
                document.getElementById('fabMenu').classList.remove('show');
            }
        });

        init();
    </script>
</body>
</html>`;
}
