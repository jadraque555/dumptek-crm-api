import { db } from '../db';
import { calls } from '../db/schema';
import { fetchRecentCalls, getRecordingUrl } from '../services/twilioService';
import { eq } from 'drizzle-orm';
import logger from '../utils/logger';

async function syncTwilioCalls() {
  try {
    logger.info('Starting Twilio call sync...');
    
    // Get last sync date (last call's createdAt)
    const lastCall = await db
      .select()
      .from(calls)
      .orderBy(calls.createdAt)
      .limit(1);
    
    const startDate = lastCall.length > 0 
      ? new Date(lastCall[0].createdAt) 
      : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Default: last 7 days
    
    // Fetch recent calls from Twilio
    let twilioCalls;
    try {
      twilioCalls = await fetchRecentCalls(startDate, 100);
    } catch (error: any) {
      if (error.message === 'Twilio credentials not configured') {
        logger.info('Skipping Twilio sync - credentials not configured');
        return;
      }
      throw error;
    }
    
    let newCallsCount = 0;
    
    for (const twilioCall of twilioCalls) {
      // Check if call already exists
      const [existing] = await db
        .select()
        .from(calls)
        .where(eq(calls.twilioCallSid, twilioCall.sid))
        .limit(1);
      
      if (existing) {
        continue;
      }
      
      // Get recording URL if available
      const recordingUrl = await getRecordingUrl(twilioCall.sid);
      
      // Insert new call
      await db.insert(calls).values({
        twilioCallSid: twilioCall.sid,
        phoneNumber: twilioCall.direction === 'inbound' ? twilioCall.from : twilioCall.to,
        duration: parseInt(twilioCall.duration),
        direction: twilioCall.direction as any,
        status: twilioCall.status,
        recordingUrl,
        transcriptionStatus: recordingUrl ? 'pending' : 'failed',
      });
      
      newCallsCount++;
    }
    
    logger.info(`Twilio call sync completed. New calls: ${newCallsCount}`);
  } catch (error) {
    logger.error('Error syncing Twilio calls:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  syncTwilioCalls()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default syncTwilioCalls;
