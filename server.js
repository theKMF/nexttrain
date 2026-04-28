const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { STATIONS, fetchTrainsBetween } = require('./lib/trains');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const API_KEY = process.env.TRAFIKVERKET_API_KEY;

app.get('/api/trains/lund-malmo', async (req, res) => {
  try {
    const trains = await fetchTrainsBetween(API_KEY, STATIONS.LUND, STATIONS.MALMO);
    res.json({ trains, direction: 'Lund → Malmö' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch train data' });
  }
});

app.get('/api/trains/malmo-lund', async (req, res) => {
  try {
    const trains = await fetchTrainsBetween(API_KEY, STATIONS.MALMO, STATIONS.LUND);
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
