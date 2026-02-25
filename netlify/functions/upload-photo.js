const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const REPO_OWNER = 'aptjjang';
const REPO_NAME = 'bohol-mission-2026';
const METADATA_PATH = 'data/uploaded_photos.json';

async function githubAPI(path, options = {}) {
  const token = process.env.GITHUB_TOKEN;
  const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}${path}`, {
    ...options,
    headers: {
      'Authorization': `token ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  return res;
}

async function getFileSha(path) {
  const res = await githubAPI(`/contents/${path}`);
  if (res.ok) {
    const data = await res.json();
    return { sha: data.sha, content: data.content };
  }
  return { sha: null, content: null };
}

async function getMetadata() {
  const { sha, content } = await getFileSha(METADATA_PATH);
  if (content) {
    try {
      const decoded = Buffer.from(content, 'base64').toString('utf-8');
      return { data: JSON.parse(decoded), sha };
    } catch (e) {
      return { data: {}, sha };
    }
  }
  return { data: {}, sha: null };
}

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: 'Method Not Allowed' };
  }

  try {
    const { day, image, filename, uploaderName } = JSON.parse(event.body);

    if (!day || !image || !filename) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: '필수 항목이 누락되었습니다' }) };
    }

    // 파일명 정리
    const timestamp = Date.now();
    const safeName = filename.replace(/[^a-zA-Z0-9가-힣._-]/g, '_');
    const uploadName = `upload_${timestamp}_${safeName}`;
    const imagePath = `images/albums/day${day}/${uploadName}`;

    // base64 데이터에서 헤더 제거 (data:image/jpeg;base64, 부분)
    const base64Data = image.includes(',') ? image.split(',')[1] : image;

    // 1. 이미지 파일 커밋
    const imageRes = await githubAPI(`/contents/${imagePath}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: `사진 업로드: ${uploadName}`,
        content: base64Data,
        branch: 'master'
      })
    });

    if (!imageRes.ok) {
      const err = await imageRes.text();
      return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: '이미지 업로드 실패', detail: err }) };
    }

    // 2. 메타데이터 업데이트
    const { data: metadata, sha: metaSha } = await getMetadata();
    if (!metadata[day]) metadata[day] = [];
    metadata[day].push({
      name: uploadName,
      uploader: uploaderName || '익명',
      uploadedAt: new Date().toISOString()
    });

    const metaContent = Buffer.from(JSON.stringify(metadata, null, 2)).toString('base64');
    const metaBody = {
      message: `사진 메타데이터 업데이트: day${day}`,
      content: metaContent,
      branch: 'master'
    };
    if (metaSha) metaBody.sha = metaSha;

    await githubAPI(`/contents/${METADATA_PATH}`, {
      method: 'PUT',
      body: JSON.stringify(metaBody)
    });

    // GitHub Pages URL
    const photoUrl = `https://${REPO_OWNER}.github.io/${REPO_NAME}/${imagePath}`;
    // raw URL (즉시 사용 가능)
    const rawUrl = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/master/${imagePath}`;

    return {
      statusCode: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        filename: uploadName,
        url: photoUrl,
        rawUrl: rawUrl
      })
    };
  } catch (e) {
    return {
      statusCode: 500,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: '서버 오류', detail: e.message })
    };
  }
};
