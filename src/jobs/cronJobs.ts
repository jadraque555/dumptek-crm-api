import cron from 'node-cron';
import syncTwilioCalls from '../scripts/syncTwilioCalls';
import processTranscriptions from '../scripts/processTranscriptions';
import logger from '../utils/logger';

export function startCronJobs() {
  if (process.env.ENABLE_CRON_JOBS !== 'true') {
    logger.info('Cron jobs are disabled');
    return;
  }
  
  logger.info('Starting cron jobs...');
  
  // Sync Twilio calls every 5 minutes
  cron.schedule(process.env.CALL_SYNC_INTERVAL || '*/5 * * * *', async () => {
    logger.info('Running Twilio call sync job');
    try {
      await syncTwilioCalls();
    } catch (error) {
      logger.error('Cron job failed: syncTwilioCalls', error);
    }
  });
  
  // Process transcriptions every 2 minutes
  cron.schedule(process.env.TRANSCRIPTION_INTERVAL || '*/2 * * * *', async () => {
    logger.info('Running transcription processing job');
    try {
      await processTranscriptions();
    } catch (error) {
      logger.error('Cron job failed: processTranscriptions', error);
    }
  });
  
  logger.info('Cron jobs started successfully');
}
