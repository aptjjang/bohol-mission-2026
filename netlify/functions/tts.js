const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const { text } = JSON.parse(event.body);
    if (!text || text.length > 500) {
      return { statusCode: 400, headers: CORS_HEADERS, body: 'Invalid text' };
    }

    const response = await fetch(
      'https://api.elevenlabs.io/v1/text-to-speech/21m00Tcm4TlvDq8ikWAM',
      {
        method: 'POST',
        headers: {
          'xi-api-key': process.env.ELEVENLABS_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          text: text,
          model_id: 'eleven_v3',
          voice_settings: { stability: 0.5, similarity_boost: 0.5 }
        })
      }
    );

    if (!response.ok) {
      return { statusCode: response.status, headers: CORS_HEADERS, body: 'TTS generation failed' };
    }

    const audioBuffer = await response.arrayBuffer();
    const base64Audio = Buffer.from(audioBuffer).toString('base64');

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'audio/mpeg' },
      body: base64Audio,
      isBase64Encoded: true
    };
  } catch (e) {
    return { statusCode: 500, headers: CORS_HEADERS, body: 'Server error' };
  }
};
