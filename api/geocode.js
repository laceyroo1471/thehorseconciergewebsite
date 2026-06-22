'use strict';

/**
 * ZIP geocode proxy (OpenStreetMap Nominatim) — avoids browser CORS/rate-limit issues.
 */
module.exports = async function handler(req, res) {
  const zip = String(req.query.zip || '')
    .trim()
    .replace(/\D/g, '');

  if (!/^\d{5}$/.test(zip)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid ZIP code' }));
    return;
  }

  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=json&q=' +
      encodeURIComponent(zip) +
      '&countrycodes=us&limit=1';

    const response = await fetch(url, {
      headers: { 'User-Agent': 'THC-Website/1.0 (thehorseconcierge.com)' },
    });

    if (!response.ok) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Geocoding service unavailable' }));
      return;
    }

    const data = await response.json();
    if (!data.length) {
      res.statusCode = 404;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'ZIP not found' }));
      return;
    }

    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.end(
      JSON.stringify({
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
        formattedAddress: data[0].display_name,
      })
    );
  } catch (err) {
    console.error('Geocode error:', err);
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Geocoding failed' }));
  }
};
