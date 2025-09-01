import express from 'express';
import multer from 'multer';
import { parse } from 'csv-parse/sync';
import fs from 'fs';
import { schedulePinJob } from '../lib/queue.js';

const upload = multer({ dest: '/tmp' });
const router = express.Router();

// CSV columns: image_url,title,description,hashtags,board_id,link,scheduled_date,scheduled_time,filename
router.post('/csv', upload.single('file'), async (req, res) => {
  const file = req.file;
  if (!file) return res.status(400).send('CSV missing');
  const raw = fs.readFileSync(file.path);
  let records = [];
  try {
    records = parse(raw, { columns: true, skip_empty_lines: true });
  } catch (e) {
    return res.status(400).send('CSV parse error');
  }

  // Simple auto-slotting: start 5 minutes from now, every 20 minutes
  let base = Date.now() + 1000 * 60 * 5;
  const slotGap = 1000 * 60 * 20; // 20 minutes

  let count = 0;
  try {
    for (let i = 0; i < records.length; i++) {
      const r = records[i];
      const publishAt = (r.scheduled_date && r.scheduled_time)
        ? new Date(`${r.scheduled_date}T${r.scheduled_time}`).getTime()
        : base + (i * slotGap);

      // In production, fetch the user's real accessToken from your DB.
      const accessToken = process.env.DEMO_ACCESS_TOKEN || '';
      if (!accessToken) {
        // You can still enqueue without token, but worker will fail. Better to enforce token presence.
        // return res.status(400).send('Missing access token (configure DEMO_ACCESS_TOKEN or implement user tokens).');
      }

      const jobData = {
        accessToken,
        image_url: r.image_url,
        filename: r.filename || (r.image_url ? r.image_url.split('/').pop() : ''),
        title: r.title || '',
        description: r.description || '',
        board_id: r.board_id,
        link: r.link || ''
      };

      await schedulePinJob(jobData, publishAt);
      count++;
    }
    res.json({ scheduled: count });
  } catch (e) {
    console.error(e);
    res.status(500).send('Scheduling failed');
  } finally {
    fs.unlinkSync(file.path);
  }
});

export default router;
