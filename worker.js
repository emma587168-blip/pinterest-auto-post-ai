import 'dotenv/config';
import fetch from 'node-fetch';
import { Worker } from 'bullmq';
import { registerMedia, uploadToUrl, createPin } from './lib/pinterest.js';
import { pinQueue } from './lib/queue.js';
import { generateContentForImage } from './lib/ai.js';

const worker = new Worker('pins', async job => {
  const data = job.data;
  let { accessToken, image_url, title, description, board_id, link, filename } = data;

  if ((!title || !title.trim()) || (!description || !description.trim())) {
    try {
      const ai = await generateContentForImage({ image_url, filename });
      title = title && title.trim() ? title : ai.title;
      description = description && description.trim() ? description : ai.description;
      if (ai.hashtags && ai.hashtags.length) {
        description = (description || '') + '\n\n' + ai.hashtags.join(' ');
      }
    } catch (e) {
      console.error('AI generation failed, using fallback', e);
      title = title || (filename || 'Auto Pin');
      description = description || '';
    }
  }

  const imgResp = await fetch(image_url);
  if (!imgResp.ok) throw new Error('Failed to fetch image: ' + imgResp.statusText);
  const arrayBuffer = await imgResp.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const reg = await registerMedia(accessToken);
  if (!reg || !reg.upload_url || !reg.media_id) throw new Error('Invalid register response: ' + JSON.stringify(reg));

  await uploadToUrl(reg.upload_url, buffer);

  const pin = await createPin(accessToken, { board_id, title, description, media_id: reg.media_id, link });

  return pin;
}, { connection: pinQueue.client.options.connection });

worker.on('completed', job => console.log('Job completed', job.id));
worker.on('failed', (job, err) => console.error('Job failed', job?.id, err));
