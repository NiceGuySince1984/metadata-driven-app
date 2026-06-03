import express from 'express';
import cors from 'cors';
import metadataRouter from './routes/metadata';
import recordsRouter from './routes/records';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', metadataRouter);
app.use('/api/records', recordsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;
