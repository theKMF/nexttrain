# Next Train 🚂

A lightweight PWA for checking train schedules between Lund C and Malmö C using real-time Trafikverket API data.

## Features

✅ **Two-way routes**: Lund → Malmö and Malmö → Lund  
✅ **Auto-location detection**: Automatically switches view based on your location  
✅ **Manual toggle**: Switch between routes anytime  
✅ **Real-time updates**: Refreshes every 30 seconds  
✅ **Live countdown**: Shows minutes until next departure  
✅ **Track information**: Displays platform/track for each train  
✅ **PWA support**: Install as an app, works offline with cached data  
✅ **Clean design**: Standard HTML, CSS, JavaScript - no frameworks  

## Setup

### Requirements
- Node.js 14+
- Trafikverket API key (get one at https://data.trafikverket.se/mypage/systems)

### Installation

1. **Clone/setup the project**
```bash
cd "Next Train"
npm install
```

2. **Configure API key**
Edit `.env` and add your Trafikverket API key:
```
TRAFIKVERKET_API_KEY=your_api_key_here
PORT=3000
```

3. **Start the server**
```bash
npm start
```

4. **Open in browser**
Navigate to `http://localhost:3000`

## How It Works

### Backend
- **Node.js/Express** server that acts as a proxy to Trafikverket API
- Queries train announcements for Lund C and Malmö C
- Filters for future departures only
- Calculates minutes until departure
- Includes track/platform information

### Frontend
- **Vanilla JavaScript** - no frameworks
- **Service Worker** for offline support and caching
- **Geolocation API** to detect user location and auto-switch views
- **Responsive design** for mobile and desktop
- Real-time updates every 30 seconds

### Data Flow
1. Frontend requests `/api/trains/lund-malmo` or `/api/trains/malmo-lund`
2. Backend queries Trafikverket API with your secret API key
3. Backend filters and formats the data
4. Frontend displays with beautiful UI

## Project Structure

```
Next Train/
├── server.js              # Node.js backend
├── package.json           # Dependencies
├── .env                   # Configuration (API key)
├── .gitignore
├── README.md
└── public/
    ├── index.html         # Main page
    ├── styles.css         # Styling
    ├── app.js             # Frontend JavaScript
    ├── sw.js              # Service worker
    └── manifest.json      # PWA manifest
```

## Station Information

- **Lund C** - Signature: `LU`
- **Malmö C** - Signature: `Mc`

These are the station identifiers used in Trafikverket API queries.

## Customization

### Change stations
Edit `server.js`:
```javascript
const STATIONS = {
  LUND: 'LU',      // Change this
  MALMO: 'Mc'      // Change this
};
```

### Adjust refresh interval
Edit `app.js`:
```javascript
setInterval(getLocationAndFetch, 30000); // Change 30000 (milliseconds)
```

### Styling
All CSS is in `public/styles.css` using CSS custom properties (`--primary`, `--accent`, etc.).

## Browser Support

- Chrome/Chromium 51+
- Firefox 44+
- Safari 11+ (PWA support in Safari 15+)
- Edge 15+

## Limitations

- Location detection requires HTTPS on production (HTTP localhost works fine)
- Geolocation requires user permission
- API calls go through your backend (keeps API key secret)

## License

MIT

## Author

Built with ❤️ for train enthusiasts
