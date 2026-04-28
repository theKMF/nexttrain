if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

const REFRESH_MS = 30000;
const COUNTDOWN_MS = 5000;

const STATIONS = {
  lund:  { lat: 55.7047, lon: 13.1910 },
  malmo: { lat: 55.6050, lon: 12.9950 }
};

const DIRECTIONS = {
  'lund-malmo': { name: 'Lund C → Malmö C', url: '/api/trains/lund-malmo' },
  'malmo-lund': { name: 'Malmö C → Lund C', url: '/api/trains/malmo-lund' }
};

const state = {
  direction: 'lund-malmo',
  trains: [],
  lastUpdate: null,
  loaded: false
};

const DOM = {
  toggleBtn: document.getElementById('toggleView'),
  content: document.getElementById('content'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  directionLabel: document.getElementById('directionLabel'),
  nextDepartureTime: document.getElementById('nextDepartureTime'),
  minutesUntil: document.getElementById('minutesUntil'),
  nextTrainNumber: document.getElementById('nextTrainNumber'),
  nextOperator: document.getElementById('nextOperator'),
  nextTrack: document.getElementById('nextTrack'),
  nextProduct: document.getElementById('nextProduct'),
  departuresBody: document.getElementById('departuresBody'),
  lastUpdated: document.getElementById('lastUpdated'),
  locationStatus: document.getElementById('locationStatus'),
  noDepartures: document.getElementById('noDepartures'),
  nextTrainContainer: document.getElementById('nextTrainContainer'),
  nextDeparture: document.querySelector('.next-departure')
};

function detectDirectionFromLocation() {
  return new Promise(resolve => {
    if (!('geolocation' in navigator)) return resolve(false);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const distSq = s => (coords.latitude - s.lat) ** 2 + (coords.longitude - s.lon) ** 2;
        state.direction = distSq(STATIONS.lund) < distSq(STATIONS.malmo) ? 'lund-malmo' : 'malmo-lund';
        resolve(true);
      },
      () => resolve(false),
      { timeout: 5000, maximumAge: 600000 }
    );
  });
}

function setLocationStatus(autoDetected) {
  DOM.locationStatus.textContent = autoDetected ? '📍 Auto-detected location' : 'Manual selection';
  DOM.locationStatus.className = autoDetected ? 'location-status' : 'location-status manual';
}

async function fetchTrains() {
  // Spinner only on first load — silent updates after that, so the UI doesn't flash every refresh
  if (!state.loaded) {
    DOM.loadingSpinner.style.display = 'flex';
    DOM.content.style.display = 'none';
  }
  try {
    const response = await fetch(DIRECTIONS[state.direction].url);
    if (!response.ok) throw new Error('Failed to fetch trains');
    const { trains = [] } = await response.json();
    state.trains = trains;
    state.lastUpdate = new Date();
    state.loaded = true;
    render();
  } catch (error) {
    console.error('Error fetching trains:', error);
    if (!state.loaded) showError(error.message);
  }
}

function render() {
  DOM.loadingSpinner.style.display = 'none';
  DOM.content.style.display = 'block';
  DOM.directionLabel.textContent = DIRECTIONS[state.direction].name;
  DOM.nextDeparture.classList.toggle('from-lund', state.direction === 'lund-malmo');
  DOM.nextDeparture.classList.toggle('from-malmo', state.direction === 'malmo-lund');
  DOM.lastUpdated.textContent = state.lastUpdate.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' });

  if (state.trains.length === 0) {
    DOM.noDepartures.style.display = 'block';
    DOM.nextTrainContainer.style.display = 'none';
    DOM.departuresBody.innerHTML = '<tr><td colspan="4" class="loading-row">No departures available</td></tr>';
    return;
  }

  DOM.noDepartures.style.display = 'none';
  DOM.nextTrainContainer.style.display = 'block';

  const next = state.trains[0];
  DOM.nextDepartureTime.textContent = next.departureTime;
  DOM.nextTrainNumber.textContent = next.trainNumber;
  DOM.nextOperator.textContent = next.operator;
  DOM.nextTrack.textContent = next.track;
  DOM.nextProduct.textContent = next.productInfo;
  updateMinutesDisplay();

  DOM.departuresBody.innerHTML = state.trains.slice(1).map(t => `
    <tr>
      <td><strong>${t.departureTime}</strong><br><small>${t.minutesUntil} min</small></td>
      <td>${t.trainNumber}</td>
      <td>${t.track}</td>
      <td><small>${t.operator}</small></td>
    </tr>
  `).join('');
}

function updateMinutesDisplay() {
  if (state.trains.length === 0) return;
  const minutes = Math.max(0, Math.round((new Date(state.trains[0].departureFull) - new Date()) / 60000));
  DOM.minutesUntil.textContent = minutes;
}

function toggleDirection() {
  state.direction = state.direction === 'lund-malmo' ? 'malmo-lund' : 'lund-malmo';
  setLocationStatus(false);
  fetchTrains();
}

function showError(message) {
  DOM.loadingSpinner.style.display = 'none';
  DOM.content.style.display = 'block';
  // Reload, since rebuilding the original DOM tree from here would be brittle
  DOM.content.innerHTML = `
    <div class="loading">
      <p style="color: var(--accent);">❌ ${message}</p>
      <button class="toggle-btn" id="retryBtn">Try Again</button>
    </div>
  `;
  document.getElementById('retryBtn').addEventListener('click', () => location.reload());
}

async function init() {
  DOM.toggleBtn.addEventListener('click', toggleDirection);
  const autoDetected = await detectDirectionFromLocation();
  setLocationStatus(autoDetected);
  await fetchTrains();
  setInterval(fetchTrains, REFRESH_MS);
  setInterval(updateMinutesDisplay, COUNTDOWN_MS);
}

init();
