import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import './db';

const app = express();
const PORT = 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
