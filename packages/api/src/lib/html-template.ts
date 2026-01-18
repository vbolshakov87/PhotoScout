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
  if (bt.includes('blue hour') && (bt.includes('evening') || bt.includes('pm')))
    return toTime(sunsetMin + 10);
  if (bt.includes('night') || bt.includes('after dark')) return toTime(sunsetMin + 45);
  return sunrise;
}

function getPhotoLinks(spotName: string, city: string) {
  const query = encodeURIComponent(`${spotName} ${city} photography`);
  const hashtag = spotName.toLowerCase().replace(/[^a-z0-9]/g, '');
  return {
    flickr: `https://www.flickr.com/search/?text=${query}&sort=interestingness-desc`,
    google: `https://www.google.com/search?tbm=isch&q=${query}`,
    instagram: `https://www.instagram.com/explore/tags/${hashtag}/`,
  };
}

function groupSpotsByDay(spots: TripPlan['spots']): Map<number, TripPlan['spots']> {
  const grouped = new Map<number, TripPlan['spots']>();
  spots.forEach((spot) => {
    const day = spot.day || 1;
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(spot);
  });
  return grouped;
}

export function generateHTML(plan: TripPlan): string {
  const lightHours = calculateLightHours(plan.sunriseSunset.sunrise, plan.sunriseSunset.sunset);
  const spotsByDay = groupSpotsByDay(plan.spots);
  const days = Array.from(spotsByDay.keys()).sort((a, b) => a - b);
  const hasMultipleDays = days.length > 1;

  const priorityBadge = (p: number) => {
    if (p === 3)
      return { icon: '🔥', text: 'MUST SEE', vertical: 'MUST SEE', class: 'priority-must' };
    if (p === 2)
      return { icon: '⭐', text: 'RECOMMENDED', vertical: 'RECOMMENDED', class: 'priority-rec' };
    return { icon: '', text: '', vertical: '', class: 'priority-opt' };
  };

  // Calculate arrival and leaving times (30-45 min per spot depending on priority)
  const getScheduleTimes = (arrivalTime: string, priority: number) => {
    const toMinutes = (t: string) => {
      const [h, m] = t.split(':').map(Number);
      return h * 60 + m;
    };
    const toTime = (mins: number) => {
      const h = Math.floor(mins / 60) % 24;
      const m = mins % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };
    const duration = priority === 3 ? 45 : priority === 2 ? 35 : 25;
    const arrivalMins = toMinutes(arrivalTime);
    return {
      arrival: arrivalTime,
      leaving: toTime(arrivalMins + duration),
      duration,
    };
  };

  const generateSpotCard = (spot: TripPlan['spots'][0], index: number, totalSpots: number) => {
    const suggestedTime = getSuggestedTime(
      spot.bestTime,
      plan.sunriseSunset.sunrise,
      plan.sunriseSunset.sunset
    );
    const photos = getPhotoLinks(spot.name, plan.city);
    const badge = priorityBadge(spot.priority);
    const schedule = getScheduleTimes(suggestedTime, spot.priority);
    const showSchedule = totalSpots > 1;

    return `
    <article class="spot ${badge.class}" id="spot-${spot.number}" data-num="${spot.number}" style="--delay: ${index * 0.05}s">
      <div class="spot-side">
        <div class="spot-number">${spot.number}</div>
        ${badge.vertical ? `<div class="spot-priority-vertical">${badge.vertical}</div>` : ''}
      </div>
      <div class="spot-body">
        <header class="spot-head">
          <div class="spot-info">
            <h3>${spot.name}</h3>
            ${
              showSchedule
                ? `
            <div class="spot-schedule">
              <span class="schedule-time">🕐 ${schedule.arrival}</span>
              <span class="schedule-arrow">→</span>
              <span class="schedule-time">${schedule.leaving}</span>
              <span class="schedule-duration">(${schedule.duration} min)</span>
            </div>
            `
                : `<div class="spot-meta"><span class="spot-time">⏰ ${suggestedTime}</span></div>`
            }
          </div>
          <label class="check-btn">
            <input type="checkbox" data-spot="${spot.number}">
            <svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
          </label>
        </header>

        <p class="spot-desc">${spot.description}</p>

        <div class="spot-details">
          <div class="detail"><span class="detail-icon">📸</span><span>${spot.bestTime}</span></div>
          <div class="detail"><span class="detail-icon">📍</span><span>${spot.distanceFromPrevious}</span></div>
          <div class="detail"><span class="detail-icon">👥</span><span>${spot.crowdLevel}</span></div>
          <div class="detail"><span class="detail-icon">🅿️</span><span>${spot.parkingInfo}</span></div>
        </div>

        <div class="spot-tags">
          ${spot.tags.map((t) => `<span class="tag">${t}</span>`).join('')}
        </div>

        <div class="spot-actions">
          <a href="https://www.google.com/maps/dir/?api=1&destination=${spot.lat},${spot.lng}" target="_blank" class="action-btn primary">
            Navigate
          </a>
          <a href="${photos.flickr}" target="_blank" class="action-btn">Flickr</a>
          <a href="${photos.google}" target="_blank" class="action-btn">Google</a>
          <a href="${photos.instagram}" target="_blank" class="action-btn">IG</a>
        </div>
      </div>
    </article>`;
  };

  const dayTabsHTML = hasMultipleDays
    ? `
    <nav class="day-nav">
      ${days
        .map(
          (day, idx) => `
        <button class="day-btn ${idx === 0 ? 'active' : ''}" data-day="${day}">
          Day ${day}
        </button>
      `
        )
        .join('')}
    </nav>
  `
    : '';

  const lightScheduleHTML = `
    <div class="light-schedule">
      <div class="light-header">
        <span>🌅 ${plan.sunriseSunset.sunrise}</span>
        <span>🌇 ${plan.sunriseSunset.sunset}</span>
      </div>
      <div class="light-grid">
        <div class="light-item blue">
          <div class="label">Blue AM</div>
          <div class="time">${lightHours.blueHourMorningStart}-${lightHours.blueHourMorningEnd}</div>
        </div>
        <div class="light-item golden">
          <div class="label">Golden AM</div>
          <div class="time">${lightHours.goldenHourMorningStart}-${lightHours.goldenHourMorningEnd}</div>
        </div>
        <div class="light-item golden">
          <div class="label">Golden PM</div>
          <div class="time">${lightHours.goldenHourEveningStart}-${lightHours.goldenHourEveningEnd}</div>
        </div>
        <div class="light-item blue">
          <div class="label">Blue PM</div>
          <div class="time">${lightHours.blueHourEveningStart}-${lightHours.blueHourEveningEnd}</div>
        </div>
      </div>
    </div>`;

  // Sort spots by suggested time
  const sortByTime = (spots: TripPlan['spots']) => {
    return [...spots].sort((a, b) => {
      const timeA = getSuggestedTime(
        a.bestTime,
        plan.sunriseSunset.sunrise,
        plan.sunriseSunset.sunset
      );
      const timeB = getSuggestedTime(
        b.bestTime,
        plan.sunriseSunset.sunrise,
        plan.sunriseSunset.sunset
      );
      return timeA.localeCompare(timeB);
    });
  };

  // Generate global spots overview for ALL spots with day grouping
  const generateAllSpotsOverview = () => {
    return days
      .map((day) => {
        const daySpots = sortByTime(spotsByDay.get(day)!);
        const spotsHtml = daySpots
          .map((spot) => {
            const time = getSuggestedTime(
              spot.bestTime,
              plan.sunriseSunset.sunrise,
              plan.sunriseSunset.sunset
            );
            const badge = priorityBadge(spot.priority);
            return `<a href="#spot-${spot.number}" class="overview-spot ${badge.class}" data-day="${day}" onclick="goToSpot(${spot.number}, ${day})">
          <span class="overview-num">${spot.number}</span>
          <span class="overview-time">${time}</span>
          <span class="overview-name">${spot.name}</span>
          ${badge.text ? `<span class="overview-badge ${badge.class}">${badge.icon}</span>` : ''}
        </a>`;
          })
          .join('');

        return hasMultipleDays
          ? `<div class="overview-day">
            <div class="overview-day-title">Day ${day}</div>
            ${spotsHtml}
          </div>`
          : spotsHtml;
      })
      .join('');
  };

  const hintsHTML = `
    <div class="hints">
      <div class="hint">💡 Arrive 15-30 min early for best light</div>
      <div class="hint">📱 Download offline maps before your trip</div>
      <div class="hint">🎒 Check gear list before leaving</div>
    </div>`;

  const allSpotsOverviewHTML = `
    <div class="all-spots-overview">
      <div class="overview-header">
        <span class="overview-title">📍 All ${plan.spots.length} Spots</span>
      </div>
      <div class="overview-days">
        ${generateAllSpotsOverview()}
      </div>
    </div>`;

  const spotsHTML = hasMultipleDays
    ? days
        .map((day) => {
          const daySpots = sortByTime(spotsByDay.get(day)!);
          return `
        <div class="day-content" data-day="${day}" ${day !== days[0] ? 'hidden' : ''}>
          ${lightScheduleHTML}
          ${daySpots.map((spot, i) => generateSpotCard(spot, i, daySpots.length)).join('')}
        </div>`;
        })
        .join('')
    : `${lightScheduleHTML}
       ${sortByTime(plan.spots)
         .map((spot, i) => generateSpotCard(spot, i, plan.spots.length))
         .join('')}`;

  const routeCoords = plan.route.map((r) => `[${r.lat}, ${r.lng}]`).join(',');
  const markerData = plan.spots
    .map(
      (s) =>
        `{lat:${s.lat},lng:${s.lng},num:${s.number},name:"${s.name.replace(/"/g, '\\"')}",p:${s.priority}}`
    )
    .join(',');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
  <meta name="theme-color" content="#000000">
  <meta name="description" content="${plan.subtitle} - ${plan.spots.length} photography spots in ${plan.city}">

  <!-- Open Graph -->
  <meta property="og:title" content="${plan.title}">
  <meta property="og:description" content="${plan.subtitle} - ${plan.spots.length} photography spots with golden hour times">
  <meta property="og:type" content="article">
  <meta property="og:site_name" content="PhotoScout">

  <!-- Twitter Card -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${plan.title}">
  <meta name="twitter:description" content="${plan.subtitle} - ${plan.spots.length} photography spots">

  <title>${plan.title} | PhotoScout</title>
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    :root {
      --bg: #fafafa;
      --card: #ffffff;
      --text: #111827;
      --text2: #6b7280;
      --text3: #9ca3af;
      --border: #e5e7eb;
      --accent: #111827;
      --blue: #3b82f6;
      --gold: #f59e0b;
      --red: #ef4444;
      --green: #10b981;
      --radius: 16px;
      --shadow: 0 1px 3px rgba(0,0,0,0.08);
      --shadow-lg: 0 4px 20px rgba(0,0,0,0.12);
    }

    [data-theme="dark"] {
      --bg: #0a0a0a;
      --card: #141414;
      --text: #f9fafb;
      --text2: #9ca3af;
      --text3: #6b7280;
      --border: #262626;
      --accent: #ffffff;
      --shadow: 0 1px 3px rgba(0,0,0,0.3);
      --shadow-lg: 0 4px 20px rgba(0,0,0,0.4);
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    html { scroll-behavior: smooth; }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, sans-serif;
      background: var(--bg);
      color: var(--text);
      line-height: 1.5;
      -webkit-font-smoothing: antialiased;
      padding-bottom: 80px;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 0 16px;
    }

    /* Animations */
    @keyframes fadeUp {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }

    @keyframes pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.05); }
    }

    @keyframes confetti {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(-100vh) rotate(720deg); opacity: 0; }
    }

    .fade-up {
      animation: fadeUp 0.5s ease-out backwards;
      animation-delay: var(--delay, 0s);
    }

    /* Top Bar */
    .top-bar {
      position: sticky;
      top: 0;
      z-index: 100;
      background: var(--card);
      border-bottom: 1px solid var(--border);
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .light-times {
      display: flex;
      gap: 12px;
      font-size: 13px;
    }

    .light-time {
      display: flex;
      align-items: center;
      gap: 4px;
    }

    .light-time strong {
      font-weight: 600;
    }

    .top-actions {
      display: flex;
      gap: 8px;
    }

    .icon-btn {
      width: 36px;
      height: 36px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--card);
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      font-size: 16px;
      transition: all 0.2s;
    }

    .icon-btn:hover {
      background: var(--border);
    }

    /* Header */
    .header {
      padding: 24px 0 20px;
    }

    .header h1 {
      font-size: 28px;
      font-weight: 700;
      letter-spacing: -0.5px;
      margin-bottom: 4px;
    }

    .header-meta {
      color: var(--text2);
      font-size: 14px;
    }

    /* Stats */
    .stats {
      display: flex;
      gap: 8px;
      margin-bottom: 20px;
    }

    .stat {
      flex: 1;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 14px;
      text-align: center;
    }

    .stat-value {
      font-size: 24px;
      font-weight: 700;
      line-height: 1.2;
    }

    .stat-label {
      font-size: 11px;
      color: var(--text3);
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    /* Light Schedule */
    .light-schedule {
      margin-bottom: 16px;
      background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
      border-radius: 12px;
      padding: 12px;
    }

    [data-theme="dark"] .light-schedule {
      background: linear-gradient(135deg, #78350f 0%, #92400e 100%);
    }

    .light-header {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 10px;
    }

    .light-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 6px;
    }

    .light-item {
      background: rgba(255,255,255,0.6);
      border-radius: 8px;
      padding: 8px 4px;
      text-align: center;
    }

    [data-theme="dark"] .light-item {
      background: rgba(0,0,0,0.2);
    }

    .light-item .label {
      font-size: 9px;
      text-transform: uppercase;
      opacity: 0.7;
      margin-bottom: 2px;
    }

    .light-item .time {
      font-size: 11px;
      font-weight: 600;
    }

    .light-item.blue { border-bottom: 2px solid #3b82f6; }
    .light-item.golden { border-bottom: 2px solid #f59e0b; }

    /* All Spots Overview - Compact */
    .all-spots-overview {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px 12px;
      margin-bottom: 16px;
    }

    .overview-header {
      margin-bottom: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    .overview-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text2);
    }

    .overview-days {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .overview-day {
      display: contents;
    }

    .overview-day-title {
      display: none;
    }

    .overview-spot {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: var(--bg);
      border-radius: 6px;
      text-decoration: none;
      color: var(--text);
      font-size: 11px;
      transition: all 0.2s;
      border-left: 2px solid var(--border);
      cursor: pointer;
    }

    .overview-spot:hover {
      background: var(--border);
    }

    .overview-spot.priority-must {
      border-left-color: #dc2626;
      background: #fef2f2;
    }

    .overview-spot.priority-rec {
      border-left-color: #f59e0b;
      background: #fffbeb;
    }

    [data-theme="dark"] .overview-spot.priority-must {
      background: rgba(220, 38, 38, 0.1);
    }

    [data-theme="dark"] .overview-spot.priority-rec {
      background: rgba(245, 158, 11, 0.1);
    }

    .overview-num {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: var(--accent);
      color: var(--bg);
      font-size: 9px;
      font-weight: 600;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .overview-spot.priority-must .overview-num {
      background: #dc2626;
    }

    .overview-spot.priority-rec .overview-num {
      background: #f59e0b;
    }

    .overview-time {
      font-weight: 500;
      font-size: 10px;
      color: var(--text3);
    }

    .overview-name {
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 100px;
    }

    .overview-badge {
      font-size: 10px;
    }

    /* Hints */
    .hints {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
    }

    .hint {
      padding: 8px 12px;
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 12px;
      color: var(--text2);
    }

    /* Day Navigation */
    .day-nav {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
    }

    .day-btn {
      padding: 10px 20px;
      border-radius: 100px;
      border: 1px solid var(--border);
      background: var(--card);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      white-space: nowrap;
      transition: all 0.2s;
      color: var(--text);
    }

    .day-btn.active {
      background: var(--accent);
      color: var(--bg);
      border-color: var(--accent);
    }

    /* Spots */
    .spots-section {
      /* padding handled by container */
    }

    .spot {
      background: var(--card);
      border: 1px solid var(--border);
      border-radius: var(--radius);
      margin-bottom: 12px;
      display: flex;
      overflow: hidden;
      animation: fadeUp 0.5s ease-out backwards;
      animation-delay: var(--delay);
      transition: all 0.3s;
    }

    .spot:hover {
      box-shadow: var(--shadow-lg);
      transform: translateY(-2px);
    }

    .spot.done {
      opacity: 0.5;
    }

    .spot.now {
      border-color: var(--gold);
      box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.15);
    }

    .spot-side {
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      background: var(--accent);
    }

    .spot.priority-must .spot-side {
      background: #dc2626;
    }

    .spot.priority-rec .spot-side {
      background: #f59e0b;
    }

    .spot-number {
      width: 48px;
      height: 48px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      font-weight: 700;
      color: white;
    }

    .spot-priority-vertical {
      flex: 1;
      writing-mode: vertical-rl;
      text-orientation: mixed;
      transform: rotate(180deg);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 1px;
      color: rgba(255,255,255,0.9);
      padding: 8px 0;
      min-height: 60px;
    }

    .spot-body {
      flex: 1;
      padding: 14px;
      min-width: 0;
    }

    .spot-head {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 12px;
      margin-bottom: 10px;
    }

    .spot-info h3 {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .spot-schedule {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
    }

    .schedule-time {
      font-weight: 600;
      color: var(--text);
    }

    .schedule-arrow {
      color: var(--text3);
    }

    .schedule-duration {
      color: var(--text3);
      font-size: 11px;
    }

    .spot-meta {
      display: flex;
      gap: 8px;
      font-size: 12px;
    }

    .spot-time {
      color: var(--text2);
    }

    .check-btn {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 2px solid var(--border);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      transition: all 0.2s;
    }

    .check-btn input { display: none; }

    .check-btn svg {
      width: 18px;
      height: 18px;
      fill: transparent;
      transition: fill 0.2s;
    }

    .check-btn:has(input:checked) {
      background: var(--green);
      border-color: var(--green);
    }

    .check-btn:has(input:checked) svg {
      fill: white;
    }

    .spot-desc {
      font-size: 14px;
      color: var(--text2);
      margin-bottom: 12px;
      line-height: 1.6;
    }

    .spot-details {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 6px;
      margin-bottom: 12px;
    }

    .detail {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 12px;
      color: var(--text2);
    }

    .detail-icon {
      font-size: 14px;
    }

    .spot-tags {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-bottom: 12px;
    }

    .tag {
      padding: 4px 10px;
      background: var(--bg);
      border-radius: 100px;
      font-size: 11px;
      color: var(--text2);
    }

    .spot-actions {
      display: flex;
      gap: 6px;
    }

    .action-btn {
      flex: 1;
      padding: 10px 8px;
      border-radius: 10px;
      border: 1px solid var(--border);
      background: var(--card);
      font-size: 12px;
      font-weight: 500;
      text-decoration: none;
      text-align: center;
      color: var(--text);
      transition: all 0.2s;
    }

    .action-btn:hover {
      background: var(--bg);
    }

    .action-btn.primary {
      background: var(--accent);
      color: var(--bg);
      border-color: var(--accent);
    }

    /* Map Section */
    .map-section {
      margin-bottom: 20px;
    }

    .section-title {
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 12px;
    }

    #map {
      height: 220px;
      border-radius: var(--radius);
      border: 1px solid var(--border);
    }

    .map-btn {
      display: block;
      width: 100%;
      margin-top: 8px;
      padding: 14px;
      background: var(--accent);
      color: var(--bg);
      border-radius: var(--radius);
      font-size: 14px;
      font-weight: 500;
      text-decoration: none;
      text-align: center;
    }

    /* Tips */
    .tips-section {
      margin: 20px 0;
    }

    .tip {
      display: flex;
      gap: 10px;
      padding: 12px 0;
      border-bottom: 1px solid var(--border);
      font-size: 14px;
    }

    .tip:last-child { border-bottom: none; }

    .tip-icon {
      color: var(--green);
    }

    /* Bottom Nav */
    .bottom-nav {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      background: var(--card);
      border-top: 1px solid var(--border);
      padding: 8px 16px;
      z-index: 100;
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
    }

    .bottom-nav-inner {
      max-width: 600px;
      margin: 0 auto;
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .progress-ring {
      width: 44px;
      height: 44px;
      position: relative;
    }

    .progress-ring svg {
      transform: rotate(-90deg);
    }

    .progress-ring circle {
      fill: none;
      stroke-width: 4;
    }

    .progress-ring .bg {
      stroke: var(--border);
    }

    .progress-ring .fill {
      stroke: var(--green);
      stroke-linecap: round;
      transition: stroke-dashoffset 0.5s ease;
    }

    .progress-text {
      position: absolute;
      inset: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 600;
    }

    .nav-info {
      flex: 1;
      min-width: 0;
    }

    .nav-current {
      font-size: 13px;
      font-weight: 500;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav-next {
      font-size: 11px;
      color: var(--text3);
    }

    .nav-btn {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      background: var(--accent);
      color: var(--bg);
      border: none;
      font-size: 18px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* Confetti */
    .confetti {
      position: fixed;
      pointer-events: none;
      z-index: 1000;
    }

    .confetti-piece {
      position: absolute;
      width: 10px;
      height: 10px;
      animation: confetti 3s ease-out forwards;
    }

    /* Map Markers */
    .marker {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 12px;
      color: white;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      border: 2px solid white;
    }

    /* Footer */
    .footer {
      text-align: center;
      padding: 24px 16px;
      font-size: 12px;
      color: var(--text3);
    }

    .footer a {
      color: var(--text2);
    }

    /* Share Modal */
    .share-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 16px;
    }

    .share-overlay.show {
      display: flex;
    }

    .share-modal {
      background: var(--card);
      border-radius: var(--radius);
      padding: 20px;
      max-width: 320px;
      width: 100%;
      box-shadow: var(--shadow-lg);
    }

    .share-title {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 16px;
      text-align: center;
    }

    .share-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      margin-bottom: 16px;
    }

    .share-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      padding: 12px 8px;
      border-radius: 12px;
      border: 1px solid var(--border);
      background: var(--bg);
      cursor: pointer;
      text-decoration: none;
      color: var(--text);
      font-size: 11px;
      transition: all 0.2s;
    }

    .share-btn:hover {
      background: var(--border);
    }

    .share-btn .icon {
      font-size: 24px;
    }

    .share-copy {
      display: flex;
      gap: 8px;
    }

    .share-copy input {
      flex: 1;
      padding: 10px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 12px;
      background: var(--bg);
      color: var(--text);
    }

    .share-copy button {
      padding: 10px 16px;
      border: none;
      border-radius: 8px;
      background: var(--accent);
      color: var(--bg);
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
    }

    .share-close {
      display: block;
      width: 100%;
      margin-top: 12px;
      padding: 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      background: var(--card);
      color: var(--text);
      font-size: 14px;
      cursor: pointer;
    }

    /* Print */
    @media print {
      .top-bar, .bottom-nav, .share-overlay { display: none !important; }
      body { padding-bottom: 0; }
    }
  </style>
</head>
<body>
  <!-- Top Bar -->
  <div class="top-bar">
    <div class="light-times">
      <div class="light-time">
        <span>🌅</span>
        <strong>${plan.sunriseSunset.sunrise}</strong>
      </div>
      <div class="light-time">
        <span>🌇</span>
        <strong>${plan.sunriseSunset.sunset}</strong>
      </div>
    </div>
    <div class="top-actions">
      <button class="icon-btn" onclick="toggleTheme()" id="themeBtn">🌙</button>
      <button class="icon-btn" onclick="window.print()">🖨️</button>
      <button class="icon-btn" onclick="openShareMenu()">↗️</button>
    </div>
  </div>

  <div class="container">
    <!-- Header -->
    <header class="header fade-up">
      <h1>${plan.title}</h1>
      <p class="header-meta">${plan.subtitle} · ${plan.dates}</p>
    </header>

    <!-- Map (at top) -->
    <section class="map-section fade-up" style="--delay: 0.1s">
      <div id="map"></div>
      <a href="https://www.google.com/maps/dir/${plan.spots.map((s) => `${s.lat},${s.lng}`).join('/')}" target="_blank" class="map-btn">
        Open in Google Maps
      </a>
    </section>

    <!-- Stats -->
    <div class="stats">
      <div class="stat fade-up" style="--delay: 0.15s">
        <div class="stat-value">${plan.spots.length}</div>
        <div class="stat-label">Spots</div>
      </div>
      <div class="stat fade-up" style="--delay: 0.2s">
        <div class="stat-value" style="color: var(--red)">${plan.spots.filter((s) => s.priority === 3).length}</div>
        <div class="stat-label">Must See</div>
      </div>
      <div class="stat fade-up" style="--delay: 0.25s">
        <div class="stat-value">${plan.practicalInfo.estimatedTime}</div>
        <div class="stat-label">Duration</div>
      </div>
    </div>

    <!-- All Spots Overview -->
    ${allSpotsOverviewHTML}

    <!-- Hints -->
    ${hintsHTML}

    <!-- Day Tabs -->
    ${dayTabsHTML}

    <!-- Spots -->
    <section class="spots-section">
      ${spotsHTML}
    </section>

    <!-- Tips -->
    <section class="tips-section">
      <h2 class="section-title">Pro Tips</h2>
      ${plan.shootingStrategy
        .map(
          (tip) => `
        <div class="tip">
          <span class="tip-icon">✓</span>
          <span>${tip}</span>
        </div>
      `
        )
        .join('')}
    </section>

    <footer class="footer">
      Created with <a href="https://aiscout.photo">PhotoScout</a>
    </footer>
  </div>

  <!-- Bottom Nav -->
  <nav class="bottom-nav">
    <div class="bottom-nav-inner">
      <div class="progress-ring">
        <svg width="44" height="44">
          <circle class="bg" cx="22" cy="22" r="18"></circle>
          <circle class="fill" cx="22" cy="22" r="18"
            stroke-dasharray="113.1"
            stroke-dashoffset="113.1"
            id="progressCircle"></circle>
        </svg>
        <div class="progress-text" id="progressText">0/${plan.spots.length}</div>
      </div>
      <div class="nav-info">
        <div class="nav-current" id="navCurrent">Tap spots to mark done</div>
        <div class="nav-next" id="navNext"></div>
      </div>
      <button class="nav-btn" onclick="scrollToNext()">→</button>
    </div>
  </nav>

  <!-- Share Modal -->
  <div class="share-overlay" id="shareOverlay" onclick="if(event.target===this)closeShareMenu()">
    <div class="share-modal">
      <div class="share-title">Share Trip Plan</div>
      <div class="share-grid">
        <a href="#" class="share-btn" onclick="shareTwitter(event)">
          <span class="icon">𝕏</span>
          <span>Twitter</span>
        </a>
        <a href="#" class="share-btn" onclick="shareTelegram(event)">
          <span class="icon">✈️</span>
          <span>Telegram</span>
        </a>
        <a href="#" class="share-btn" onclick="shareWhatsApp(event)">
          <span class="icon">💬</span>
          <span>WhatsApp</span>
        </a>
        <a href="#" class="share-btn" onclick="sharePinterest(event)">
          <span class="icon">📌</span>
          <span>Pinterest</span>
        </a>
        <a href="#" class="share-btn" onclick="copyInstagram(event)">
          <span class="icon">📷</span>
          <span>Instagram</span>
        </a>
        <a href="#" class="share-btn" onclick="nativeShare(event)">
          <span class="icon">📤</span>
          <span>More...</span>
        </a>
      </div>
      <div class="share-copy">
        <input type="text" id="shareUrl" value="" readonly onclick="this.select()">
        <button onclick="copyLink()">Copy</button>
      </div>
      <button class="share-close" onclick="closeShareMenu()">Close</button>
    </div>
  </div>

  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    // State
    const TOTAL = ${plan.spots.length};
    const STORAGE = 'ps-${plan.city.toLowerCase().replace(/[^a-z0-9]/g, '')}';
    let checked = new Set(JSON.parse(localStorage.getItem(STORAGE) || '[]'));

    // Theme
    function toggleTheme() {
      const isDark = document.body.dataset.theme === 'dark';
      document.body.dataset.theme = isDark ? 'light' : 'dark';
      document.getElementById('themeBtn').textContent = isDark ? '🌙' : '☀️';
      localStorage.setItem('theme', document.body.dataset.theme);
    }

    // Init theme
    if (localStorage.getItem('theme') === 'dark') {
      document.body.dataset.theme = 'dark';
      document.getElementById('themeBtn').textContent = '☀️';
    }

    // Go to spot (switch tab if needed and scroll)
    function goToSpot(spotNum, day) {
      event.preventDefault();

      // Switch to correct day tab if multi-day
      const dayBtn = document.querySelector('.day-btn[data-day="' + day + '"]');
      if (dayBtn && !dayBtn.classList.contains('active')) {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        dayBtn.classList.add('active');
        document.querySelectorAll('.day-content').forEach(c => {
          c.hidden = c.dataset.day !== String(day);
        });
      }

      // Scroll to spot
      setTimeout(() => {
        const spot = document.getElementById('spot-' + spotNum);
        if (spot) {
          spot.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }

    // Progress
    function updateProgress() {
      const done = checked.size;
      const pct = done / TOTAL;
      const offset = 113.1 * (1 - pct);
      document.getElementById('progressCircle').style.strokeDashoffset = offset;
      document.getElementById('progressText').textContent = done + '/' + TOTAL;

      // Update nav info
      const nextNum = ${JSON.stringify(plan.spots.map((s) => s.number))}.find(n => !checked.has(n));
      if (nextNum) {
        const spot = document.getElementById('spot-' + nextNum);
        if (spot) {
          document.getElementById('navCurrent').textContent = 'Next: ' + spot.querySelector('h3').textContent;
        }
      } else {
        document.getElementById('navCurrent').textContent = 'All spots complete! 🎉';
      }

      // Confetti on complete
      if (done === TOTAL && !window.confettiDone) {
        window.confettiDone = true;
        celebrate();
      }
    }

    function celebrate() {
      const colors = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];
      for (let i = 0; i < 50; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left = Math.random() * 100 + 'vw';
        piece.style.background = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDelay = Math.random() * 0.5 + 's';
        document.body.appendChild(piece);
        setTimeout(() => piece.remove(), 3500);
      }
    }

    // Checkbox handlers
    document.querySelectorAll('[data-spot]').forEach(cb => {
      const num = parseInt(cb.dataset.spot);
      cb.checked = checked.has(num);
      if (checked.has(num)) {
        cb.closest('.spot').classList.add('done');
      }

      cb.addEventListener('change', () => {
        if (cb.checked) {
          checked.add(num);
        } else {
          checked.delete(num);
          window.confettiDone = false;
        }
        cb.closest('.spot').classList.toggle('done', cb.checked);
        localStorage.setItem(STORAGE, JSON.stringify([...checked]));
        updateProgress();
      });
    });

    // Scroll to next
    function scrollToNext() {
      const nextNum = ${JSON.stringify(plan.spots.map((s) => s.number))}.find(n => !checked.has(n));
      if (nextNum) {
        document.getElementById('spot-' + nextNum).scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }

    // Day tabs
    document.querySelectorAll('.day-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.day-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.day-content').forEach(c => {
          c.hidden = c.dataset.day !== btn.dataset.day;
        });
      });
    });

    // Map
    const map = L.map('map', { scrollWheelZoom: false })
      .setView([${plan.mapCenter.lat}, ${plan.mapCenter.lng}], ${plan.mapZoom});

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap © CARTO',
      maxZoom: 19
    }).addTo(map);

    const markers = [${markerData}];
    const colors = { 3: '#ef4444', 2: '#f59e0b', 1: '#94a3b8' };

    markers.forEach(m => {
      const icon = L.divIcon({
        className: 'marker',
        html: '<div style="background:' + colors[m.p] + '" class="marker">' + m.num + '</div>',
        iconSize: [28, 28],
        iconAnchor: [14, 14]
      });
      L.marker([m.lat, m.lng], { icon })
        .addTo(map)
        .bindPopup('<b>' + m.name + '</b>');
    });

    const route = [${routeCoords}];
    L.polyline(route, { color: '#111', weight: 2, opacity: 0.5, dashArray: '8,8' }).addTo(map);
    if (route.length > 0) map.fitBounds(route, { padding: [40, 40] });

    // Init
    updateProgress();

    // Share functions
    const shareTitle = ${JSON.stringify(plan.title)};
    const shareText = ${JSON.stringify(`${plan.title} - ${plan.subtitle}`)};

    function openShareMenu() {
      document.getElementById('shareUrl').value = window.location.href;
      document.getElementById('shareOverlay').classList.add('show');
    }

    function closeShareMenu() {
      document.getElementById('shareOverlay').classList.remove('show');
    }

    function copyLink() {
      const input = document.getElementById('shareUrl');
      input.select();
      document.execCommand('copy');
      const btn = input.nextElementSibling;
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy', 2000);
    }

    function shareTwitter(e) {
      e.preventDefault();
      const url = 'https://twitter.com/intent/tweet?text=' + encodeURIComponent(shareText + ' via @PhotoScoutApp') + '&url=' + encodeURIComponent(window.location.href);
      window.open(url, '_blank', 'width=550,height=420');
    }

    function shareTelegram(e) {
      e.preventDefault();
      const url = 'https://t.me/share/url?url=' + encodeURIComponent(window.location.href) + '&text=' + encodeURIComponent(shareText);
      window.open(url, '_blank', 'width=550,height=420');
    }

    function shareWhatsApp(e) {
      e.preventDefault();
      const url = 'https://wa.me/?text=' + encodeURIComponent(shareText + ' ' + window.location.href);
      window.open(url, '_blank', 'width=550,height=420');
    }

    function sharePinterest(e) {
      e.preventDefault();
      const url = 'https://pinterest.com/pin/create/button/?url=' + encodeURIComponent(window.location.href) + '&description=' + encodeURIComponent(shareText);
      window.open(url, '_blank', 'width=550,height=520');
    }

    function copyInstagram(e) {
      e.preventDefault();
      navigator.clipboard.writeText(shareText + '\\n\\n' + window.location.href);
      alert('Link copied! Open Instagram and paste in your story or post.');
    }

    function nativeShare(e) {
      e.preventDefault();
      if (navigator.share) {
        navigator.share({ title: shareTitle, text: shareText, url: window.location.href });
      } else {
        copyLink();
      }
    }
  </script>
</body>
</html>`;
}
