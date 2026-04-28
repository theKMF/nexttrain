const express = require('express');
const cors = require('cors');
require('dotenv').config();
const https = require('https');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const API_KEY = process.env.TRAFIKVERKET_API_KEY;
const TRAFIKVERKET_API = 'https://api.trafikinfo.trafikverket.se/v2/data.json';

// Station signatures
const STATIONS = {
  LUND: 'LU',
  MALMO: 'Mc'
};

function buildAnnouncementQuery(stationSig, activityType, limit) {
  return `
    <REQUEST>
      <LOGIN authenticationkey="${API_KEY}" />
      <QUERY objecttype="TrainAnnouncement" schemaversion="1.0" limit="${limit}" orderby="AdvertisedTimeAtLocation">
        <FILTER>
          <AND>
            <EQ name="LocationSignature" value="${stationSig}" />
            <EQ name="ActivityType" value="${activityType}" />
            <GT name="AdvertisedTimeAtLocation" value="$now" />
          </AND>
        </FILTER>
      </QUERY>
    </REQUEST>
  `;
}

function postXmlQuery(xml) {
  return new Promise((resolve, reject) => {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/xml',
        'Content-Length': Buffer.byteLength(xml)
      }
    };
    const req = https.request(TRAFIKVERKET_API, options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error('Invalid API response')); }
      });
    });
    req.on('error', reject);
    req.write(xml);
    req.end();
  });
}

function extractAnnouncements(json) {
  const list = json?.RESPONSE?.RESULT?.[0]?.TrainAnnouncement;
  if (!list) return [];
  return Array.isArray(list) ? list : [list];
}

async function fetchTrainsBetween(fromSig, toSig) {
  const [departures, arrivals] = await Promise.all([
    postXmlQuery(buildAnnouncementQuery(fromSig, 'Avgang', 30)).then(extractAnnouncements),
    postXmlQuery(buildAnnouncementQuery(toSig, 'Ankomst', 80)).then(extractAnnouncements)
  ]);

  const arrivalsByTrain = new Map();
  arrivals.forEach(a => {
    const list = arrivalsByTrain.get(a.AdvertisedTrainIdent) || [];
    list.push(new Date(a.AdvertisedTimeAtLocation));
    arrivalsByTrain.set(a.AdvertisedTrainIdent, list);
  });
  arrivalsByTrain.forEach(list => list.sort((a, b) => a - b));

  // Train numbers get reused across the day for different runs, so pair each
  // departure with the *earliest* same-numbered arrival that comes after it.
  // The Lund–Malmö trip is ~8–13 min; anything beyond ~14 min is a different run.
  const MAX_TRIP_MINUTES = 14;
  const valid = departures.filter(d => {
    const arrs = arrivalsByTrain.get(d.AdvertisedTrainIdent);
    if (!arrs) return false;
    const depTime = new Date(d.AdvertisedTimeAtLocation);
    const nextArr = arrs.find(a => a > depTime);
    if (!nextArr) return false;
    return (nextArr - depTime) / 60000 <= MAX_TRIP_MINUTES;
  });

  return formatTrains(valid).slice(0, 6);
}

const ALLOWED_OPERATORS = new Set(['Skånetrafiken', 'Öresundståg']);

function formatTrains(trains) {
  const announcements = [];
  const now = new Date();

  trains.forEach(train => {
    if (!ALLOWED_OPERATORS.has(train.InformationOwner)) return;

    const departureTime = new Date(train.AdvertisedTimeAtLocation);
    const minutesUntilDeparture = Math.round((departureTime - now) / 60000);

    if (minutesUntilDeparture > -2) {
      announcements.push({
        trainNumber: train.AdvertisedTrainIdent,
        departureTime: departureTime.toLocaleTimeString('sv-SE', {
          hour: '2-digit',
          minute: '2-digit'
        }),
        departureFull: departureTime.toISOString(),
        minutesUntil: Math.max(0, minutesUntilDeparture),
        track: train.TrackAtLocation || 'N/A',
        operator: train.InformationOwner || 'Okänd',
        productInfo: train.ProductInformation?.[0] || 'Tåg',
        canceled: train.Canceled || false,
        destination: train.ToLocation?.[0] || 'Okänd destination'
      });
    }
  });

  announcements.sort((a, b) => new Date(a.departureFull) - new Date(b.departureFull));
  return announcements;
}

app.get('/api/trains/lund-malmo', async (req, res) => {
  try {
    const trains = await fetchTrainsBetween(STATIONS.LUND, STATIONS.MALMO);
    res.json({ trains, direction: 'Lund → Malmö' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch train data' });
  }
});

app.get('/api/trains/malmo-lund', async (req, res) => {
  try {
    const trains = await fetchTrainsBetween(STATIONS.MALMO, STATIONS.LUND);
    res.json({ trains, direction: 'Malmö → Lund' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch train data' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Next Train running on http://localhost:${PORT}`);
});
