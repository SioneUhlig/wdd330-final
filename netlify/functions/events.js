const fetch = require('node-fetch');

exports.handler = async (event, context) => {
  // Enable CORS
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const { city, stateCode, radius, unit, size, sort, classificationName, segmentName, startDateTime, endDateTime, keyword } = event.queryStringParameters || {};
    
    // Use environment variable in production, fallback for development
    const apiKey = process.env.TICKETMASTER_API_KEY || 'AZXBgygoWqnwsmMji9gGqAHvdTHzoyhu';
    
    // Build URL with parameters
    let url = `https://app.ticketmaster.com/discovery/v2/events.json?apikey=${apiKey}`;
    
    if (city) url += `&city=${encodeURIComponent(city)}`;
    if (stateCode) url += `&stateCode=${encodeURIComponent(stateCode)}`;
    if (radius) url += `&radius=${radius}`;
    if (unit) url += `&unit=${unit}`;
    if (size) url += `&size=${size}`;
    if (sort) url += `&sort=${sort}`;
    if (classificationName) url += `&classificationName=${encodeURIComponent(classificationName)}`;
    if (segmentName) url += `&segmentName=${encodeURIComponent(segmentName)}`;
    if (startDateTime) url += `&startDateTime=${startDateTime}`;
    if (endDateTime) url += `&endDateTime=${endDateTime}`;
    if (keyword) url += `&keyword=${encodeURIComponent(keyword)}`;

    console.log('Fetching from Ticketmaster API');

    const response = await fetch(url);
    const data = await response.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(data)
    };
  } catch (error) {
    console.error('Error fetching events:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to fetch events', details: error.message })
    };
  }
};