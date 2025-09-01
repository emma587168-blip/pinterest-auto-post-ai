import 'dotenv/config';
import express from 'express';
import authRoutes from './routes/auth.js';
import scheduleRoutes from './routes/schedule.js';

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.send('Pinterest Auto Post + AI backend is running ✅');
});

app.use('/auth', authRoutes);
app.use('/schedule', scheduleRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log('Server listening on', PORT));
