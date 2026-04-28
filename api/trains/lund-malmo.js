const { STATIONS, fetchTrainsBetween } = require('../../lib/trains');

module.exports = async (req, res) => {
  try {
    const trains = await fetchTrainsBetween(
      process.env.TRAFIKVERKET_API_KEY,
      STATIONS.LUND,
      STATIONS.MALMO
    );
    res.status(200).json({ trains, direction: 'Lund → Malmö' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to fetch train data' });
  }
};
