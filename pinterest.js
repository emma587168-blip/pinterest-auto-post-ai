import fetch from 'node-fetch';

const API_HOST = process.env.USE_SANDBOX === 'true'
  ? 'https://api-sandbox.pinterest.com'
  : 'https://api.pinterest.com';

export async function exchangeCodeForToken(code, redirectUri) {
  const url = `${API_HOST}/v5/oauth/token`;
  const body = {
    grant_type: 'authorization_code',
    code,
    client_id: process.env.PINTEREST_CLIENT_ID,
    client_secret: process.env.PINTEREST_CLIENT_SECRET,
    redirect_uri: redirectUri
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function refreshAccessToken(refreshToken) {
  const url = `${API_HOST}/v5/oauth/token`;
  const body = {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: process.env.PINTEREST_CLIENT_ID,
    client_secret: process.env.PINTEREST_CLIENT_SECRET
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  return res.json();
}

export async function registerMedia(accessToken, mediaType='image') {
  const url = `${API_HOST}/v5/media`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ media_type: mediaType })
  });
  return res.json(); // contains upload_url and media_id
}

export async function uploadToUrl(uploadUrl, buffer, mime='image/jpeg') {
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    headers: { 'Content-Type': mime },
    body: buffer
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Upload failed: ${res.status} ${txt}`);
  }
  return true;
}

export async function createPin(accessToken, {board_id, title, description, media_id, link}) {
  const url = `${API_HOST}/v5/pins`;
  const body = {
    board_id,
    title,
    description,
    media_source: { source_type: 'uploaded', media_id }
  };
  if (link) body.link = link;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  return res.json();
}
