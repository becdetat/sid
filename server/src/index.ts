import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import './db';
import accountRoutes from './accounts/routes';
import transactionRoutes from './transactions/routes';
import { txAttachmentRouter, attachmentRouter } from './attachments/routes';
import dashboardRoutes from './dashboard/routes';
import dashboardConfigRoutes from './dashboard-config/routes';
import exportRoutes from './export/routes';
import importRoutes from './import/routes';
import categoriesRoutes from './categories/routes';
import backupExportRoutes from './backup/exportRoutes';
import backupImportRoutes from './backup/importRoutes';
import chartRoutes from './chart/routes';

const app = express();
const PORT = 3000;

app.use(cors({ origin: process.env.CORS_ORIGIN ?? '*' }));
app.use(express.json());

app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok' });
});

app.use('/api/backup', backupExportRoutes);
app.use('/api/backup', backupImportRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/dashboard-config', dashboardConfigRoutes);
app.use('/api/categories', categoriesRoutes);
app.use('/api/accounts/:id/export', exportRoutes);
app.use('/api/accounts/:id/chart', chartRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/accounts/:accountId/transactions/import', importRoutes);
app.use('/api/accounts/:accountId/transactions', transactionRoutes);
app.use('/api/transactions/:txId/attachments', txAttachmentRouter);
app.use('/api/attachments', attachmentRouter);

const clientDist = path.resolve(__dirname, '../../client/dist');
if (fs.existsSync(clientDist)) {
    app.use(express.static(clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.listen(PORT, () => {
    console.log(`Server listening on http://localhost:${PORT}`);
});
