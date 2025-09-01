import { Queue, QueueScheduler } from 'bullmq';
import IORedis from 'ioredis';
const connection = new IORedis(process.env.REDIS_URL);

export const pinQueue = new Queue('pins', { connection });
new QueueScheduler('pins', { connection });

export async function schedulePinJob(jobData, publishAt) {
  const delay = Math.max(0, publishAt - Date.now());
  return await pinQueue.add('createPin', jobData, {
    delay,
    attempts: 5,
    backoff: { type: 'exponential', delay: 1000 }
  });
}
