import express from 'express';
import { exchangeCodeForToken } from '../lib/pinterest.js';

const router = express.Router();

const CLIENT_ID = process.env.PINTEREST_CLIENT_ID;
const REDIRECT_URI = process.env.PINTEREST_REDIRECT_URI;
const SCOPES = encodeURIComponent('pins:write,boards:read,user_accounts:read');

router.get('/pinterest', (req, res) => {
  const state = 'state_' + Date.now();
  const host = process.env.USE_SANDBOX === 'true' ? 'https://sandbox.pinterest.com' : 'https://www.pinterest.com';
  const url = `${host}/oauth/?response_type=code&client_id=${CLIENT_ID}&redirect_uri=${encodeURIComponent(REDIRECT_URI)}&scope=${SCOPES}&state=${state}`;
  res.redirect(url);
});

router.get('/pinterest/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).send('Missing code');
  try {
    const tokenResp = await exchangeCodeForToken(code, REDIRECT_URI);
    // TODO: Save tokenResp.access_token and refresh_token tied to your user securely in DB.
    res.json(tokenResp);
  } catch (e) {
    console.error(e);
    res.status(500).send('Token exchange failed');
  }
});

export default router;
