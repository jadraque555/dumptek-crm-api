import Koa from 'koa';
import cors from '@koa/cors';
import bodyParser from 'koa-bodyparser';
import dotenv from 'dotenv';
import router from './routes';
import { errorHandler } from './middleware/errorHandler';
import { startCronJobs } from './jobs/cronJobs';
import logger from './utils/logger';

dotenv.config();

const app = new Koa();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(errorHandler);
app.use(cors());
app.use(bodyParser());

// Routes
app.use(router.routes());
app.use(router.allowedMethods());

// Start server
app.listen(PORT, () => {
  logger.info(`Server running on port ${PORT}`);
  
  // Start cron jobs
  startCronJobs();
});

export default app;
