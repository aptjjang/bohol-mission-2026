const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const REPO_OWNER = 'aptjjang';
const REPO_NAME = 'bohol-mission-2026';
const METADATA_PATH = 'data/uploaded_photos.json';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const day = event.queryStringParameters && event.queryStringParameters.day;

    // GitHub Pages에서 메타데이터 파일 가져오기 (캐시 무시)
    const metaUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/master/${METADATA_PATH}?t=${Date.now()}`;
    const res = await fetch(metaUrl);

    if (!res.ok) {
      // 파일이 아직 없으면 빈 데이터 반환
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify(day ? [] : {})
      };
    }

    const metadata = await res.json();

    if (day) {
      // 특정 일차의 사진만 반환
      const photos = metadata[day] || [];
      const result = photos.map(p => ({
        ...p,
        url: `https://${REPO_OWNER}.github.io/${REPO_NAME}/images/albums/day${day}/${p.name}`,
        rawUrl: `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/master/images/albums/day${day}/${p.name}`
      }));
      return {
        statusCode: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      };
    }

    // 전체 데이터 반환
    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify(metadata)
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: '서버 오류', detail: e.message })
    };
  }
};
