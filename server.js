const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

const app = express();
const PORT = 3000;

// Enable CORS for your frontend
app.use(cors());
app.use(express.json());

// Serve static files from your project
app.use(express.static('.'));

// Proxy endpoint for Ticketmaster API
app.get('/api/events', async (req, res) => {
    try {
        const { city, stateCode, radius, unit, size, sort } = req.query;

        const apiKey = 'AZXBgygoWqnwsmMji9gGqAHvdTHzoyhu';
        const url = `https://app.ticketmaster.com/discovery/v2/events.json?city=${city}&stateCode=${stateCode}&radius=${radius}&unit=${unit}&size=${size}&sort=${sort}&apikey=${apiKey}`;

        console.log('Fetching from Ticketmaster:', url);

        const response = await fetch(url);
        const data = await response.json();

        res.json(data);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Failed to fetch events' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`📍 Open your browser and go to http://localhost:${PORT}`);
});