export interface TripPlan {
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

export function generateHTML(plan: TripPlan): string {
  const priorityStars = (priority: number) => '⭐'.repeat(priority);

  const spotsHTML = plan.spots
    .map(
      (spot) => `
    <!-- Spot ${spot.number} -->
    <div class="spot-card" id="spot-${spot.number}">
        <div class="spot-header">
            <div class="spot-number">${spot.number}</div>
            <div class="spot-name">${spot.name}</div>
            <div class="priority">${priorityStars(spot.priority)}</div>
        </div>
        <div class="spot-body">
            <div class="coordinates">${spot.lat.toFixed(4)}° N, ${spot.lng.toFixed(4)}° E</div>
            <div class="links">
                <a href="https://www.google.com/maps?q=${spot.lat},${spot.lng}" target="_blank" class="link-btn"><i class="fas fa-map-marked-alt"></i> Google Maps</a>
                <a href="https://www.flickr.com/search/?text=${encodeURIComponent(spot.name)}" target="_blank" class="link-btn"><i class="fab fa-flickr"></i> Flickr</a>
            </div>
            <p class="description">${spot.description}</p>
            <div class="tags">
                <span class="tag time-tag">${spot.bestTime}</span>
                ${spot.tags.map((tag) => `<span class="tag">${tag}</span>`).join('\n                ')}
            </div>
            <div class="practical">
                <p><strong>📍 Distance:</strong> ${spot.distanceFromPrevious}</p>
                <p><strong>🅿️ Parking:</strong> ${spot.parkingInfo}</p>
                <p><strong>👥 Crowds:</strong> ${spot.crowdLevel}</p>
                <p><strong>♿ Access:</strong> ${spot.accessibility}</p>
            </div>
        </div>
    </div>
`
    )
    .join('\n');

  const routeCoords = plan.route.map((r) => `[${r.lat}, ${r.lng}]`).join(',\n            ');

  const markerCoords = plan.spots
    .map((s) => `[${s.lat}, ${s.lng}, ${s.number}, "${s.name.replace(/"/g, '\\"')}"]`)
    .join(',\n            ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${plan.title} - ${plan.subtitle}</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: #1a1a2e;
            color: #e0e0e0;
            line-height: 1.6;
            padding-bottom: 40px;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
        }
        h1 {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            color: #fff;
        }
        .subtitle {
            font-size: 1.2rem;
            color: #a0a0c0;
            margin-bottom: 0.5rem;
        }
        .dates {
            color: #8080a0;
            margin-bottom: 1.5rem;
        }
        #map {
            height: 400px;
            border-radius: 12px;
            margin-bottom: 2rem;
            box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        }
        .section {
            background: #25253e;
            border-radius: 12px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
        }
        .section h2 {
            color: #fff;
            font-size: 1.5rem;
            margin-bottom: 1rem;
            border-bottom: 2px solid #3a3a5c;
            padding-bottom: 0.5rem;
        }
        .shooting-strategy {
            list-style: none;
            padding: 0;
        }
        .shooting-strategy li {
            padding: 0.5rem 0;
            padding-left: 1.5rem;
            position: relative;
        }
        .shooting-strategy li:before {
            content: "☀️";
            position: absolute;
            left: 0;
        }
        .spot-card {
            background: #2a2a4a;
            border-radius: 10px;
            padding: 1.5rem;
            margin-bottom: 1.5rem;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            transition: transform 0.2s, box-shadow 0.2s;
        }
        .spot-card:hover {
            transform: translateY(-2px);
            box-shadow: 0 4px 16px rgba(0,0,0,0.3);
        }
        .spot-header {
            display: flex;
            align-items: center;
            gap: 1rem;
            margin-bottom: 1rem;
        }
        .spot-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 1.2rem;
            flex-shrink: 0;
        }
        .spot-name {
            font-size: 1.3rem;
            font-weight: 600;
            color: #fff;
            flex-grow: 1;
        }
        .priority {
            font-size: 1.2rem;
        }
        .spot-body {
            padding-left: 56px;
        }
        .coordinates {
            color: #a0a0c0;
            font-size: 0.9rem;
            margin-bottom: 0.75rem;
        }
        .links {
            display: flex;
            gap: 0.75rem;
            margin-bottom: 1rem;
            flex-wrap: wrap;
        }
        .link-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.5rem 1rem;
            background: #3a3a5c;
            color: #e0e0e0;
            text-decoration: none;
            border-radius: 6px;
            font-size: 0.9rem;
            transition: background 0.2s;
        }
        .link-btn:hover {
            background: #4a4a6c;
        }
        .link-btn i {
            font-size: 1rem;
        }
        .description {
            margin-bottom: 1rem;
            line-height: 1.7;
        }
        .tags {
            display: flex;
            flex-wrap: wrap;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }
        .tag {
            background: #3a3a5c;
            color: #c0c0d0;
            padding: 0.25rem 0.75rem;
            border-radius: 16px;
            font-size: 0.85rem;
        }
        .time-tag {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            font-weight: 500;
        }
        .practical {
            background: #1a1a2e;
            border-radius: 6px;
            padding: 1rem;
            margin-top: 1rem;
        }
        .practical p {
            margin-bottom: 0.5rem;
            font-size: 0.95rem;
        }
        .practical p:last-child {
            margin-bottom: 0;
        }
        .practical strong {
            color: #a0a0c0;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 1rem;
        }
        .info-item {
            background: #1a1a2e;
            padding: 1rem;
            border-radius: 6px;
        }
        .info-item strong {
            display: block;
            color: #a0a0c0;
            margin-bottom: 0.5rem;
        }
        @media (max-width: 768px) {
            .container {
                padding: 15px;
            }
            h1 {
                font-size: 1.5rem;
            }
            .subtitle {
                font-size: 1rem;
            }
            #map {
                height: 300px;
            }
            .spot-body {
                padding-left: 0;
            }
            .spot-header {
                flex-wrap: wrap;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${plan.title}</h1>
        <div class="subtitle">${plan.subtitle}</div>
        <div class="dates">📅 ${plan.dates}</div>

        <div id="map"></div>

        <div class="section">
            <h2>🌅 Shooting Strategy</h2>
            <div style="background: #1a1a2e; padding: 1rem; border-radius: 6px; margin-bottom: 1rem;">
                <p><strong>Sunrise:</strong> ${plan.sunriseSunset.sunrise} | <strong>Sunset:</strong> ${plan.sunriseSunset.sunset}</p>
                <p style="color: #a0a0c0; margin-top: 0.5rem;">${plan.sunriseSunset.note}</p>
            </div>
            <ul class="shooting-strategy">
                ${plan.shootingStrategy.map((strategy) => `<li>${strategy}</li>`).join('\n                ')}
            </ul>
        </div>

        <div class="section">
            <h2>📍 Photography Spots</h2>
            ${spotsHTML}
        </div>

        <div class="section">
            <h2>ℹ️ Practical Information</h2>
            <div class="info-grid">
                <div class="info-item">
                    <strong>🚗 Total Distance</strong>
                    ${plan.practicalInfo.totalDistance}
                </div>
                <div class="info-item">
                    <strong>⏱️ Estimated Time</strong>
                    ${plan.practicalInfo.estimatedTime}
                </div>
                <div class="info-item">
                    <strong>🏨 Accommodation</strong>
                    ${plan.practicalInfo.accommodation}
                </div>
                <div class="info-item">
                    <strong>🚙 Transportation</strong>
                    ${plan.practicalInfo.transportation}
                </div>
                <div class="info-item" style="grid-column: 1 / -1;">
                    <strong>☔ Weather Backup</strong>
                    ${plan.practicalInfo.weatherBackup}
                </div>
            </div>
        </div>
    </div>

    <script>
        // Initialize map
        const map = L.map('map').setView([${plan.mapCenter.lat}, ${plan.mapCenter.lng}], ${plan.mapZoom});

        // Add dark theme tiles
        L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
            subdomains: 'abcd',
            maxZoom: 20
        }).addTo(map);

        // Add markers for each spot
        const markers = [
            ${markerCoords}
        ];

        markers.forEach(([lat, lng, number, name]) => {
            const marker = L.marker([lat, lng]).addTo(map);
            marker.bindPopup(\`<strong>\${number}. \${name}</strong>\`);
        });

        // Add route polyline
        const routeCoords = [
            ${routeCoords}
        ];

        if (routeCoords.length > 1) {
            L.polyline(routeCoords, {
                color: '#667eea',
                weight: 3,
                opacity: 0.7
            }).addTo(map);
        }

        // Add click handlers to spot cards to pan map
        document.querySelectorAll('.spot-card').forEach((card, index) => {
            card.style.cursor = 'pointer';
            card.addEventListener('click', () => {
                if (markers[index]) {
                    map.setView([markers[index][0], markers[index][1]], 14);
                    markers.forEach(([lat, lng, num]) => {
                        if (num === index + 1) {
                            L.marker([lat, lng]).openPopup();
                        }
                    });
                }
            });
        });
    </script>
</body>
</html>`;
}
