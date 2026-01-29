import { eq } from 'drizzle-orm';
import { db } from '../db';
import { calls } from '../db/schema';
import { downloadRecording } from '../services/twilioService';
import { transcribeAudio, analyzeCallTranscription } from '../services/openaiService';
import { shouldAutoCreateProspect, needsReview, autoCreateProspect } from '../services/prospectService';
import logger from '../utils/logger';

async function processTranscriptions() {
  try {
    logger.info('Starting transcription processing...');
    
    // Get pending transcriptions
    const pendingCalls = await db
      .select()
      .from(calls)
      .where(eq(calls.transcriptionStatus, 'pending'))
      .limit(10); // Process 10 at a time
    
    logger.info(`Found ${pendingCalls.length} pending transcriptions`);
    
    for (const call of pendingCalls) {
      try {
        // Update status to processing
        await db
          .update(calls)
          .set({ transcriptionStatus: 'processing' })
          .where(eq(calls.id, call.id));
        
        if (!call.recordingUrl) {
          await db
            .update(calls)
            .set({ transcriptionStatus: 'failed' })
            .where(eq(calls.id, call.id));
          continue;
        }
        
        // Download recording
        logger.info(`Downloading recording for call ${call.id}`);
        const audioBuffer = await downloadRecording(call.recordingUrl);
        
        // Transcribe
        logger.info(`Transcribing call ${call.id}`);
        const transcriptionText = await transcribeAudio(
          audioBuffer,
          `call_${call.id}.mp3`
        );
        
        // Analyze
        logger.info(`Analyzing call ${call.id}`);
        const analysis = await analyzeCallTranscription(transcriptionText);
        
        // Update call with transcription and analysis
        await db
          .update(calls)
          .set({
            transcriptionText,
            transcriptionStatus: 'completed',
            summaryText: analysis.summary,
            summaryData: analysis as any,
            isProspect: analysis.is_prospect,
            prospectScore: analysis.prospect_score,
            confidenceLevel: analysis.confidence_level,
            interestIndicators: analysis.interest_indicators,
            callClassification: analysis.call_classification,
            sentiment: analysis.sentiment,
            updatedAt: new Date(),
          })
          .where(eq(calls.id, call.id));
        
        // Auto-create prospect if criteria met
        if (await shouldAutoCreateProspect(analysis)) {
          logger.info(`Auto-creating prospect for call ${call.id}`);
          await autoCreateProspect(call.id, call.phoneNumber, analysis);
        } else if (await needsReview(analysis)) {
          logger.info(`Flagging call ${call.id} for review`);
          await db
            .update(calls)
            .set({ requiresReview: true })
            .where(eq(calls.id, call.id));
        }
        
        logger.info(`Successfully processed call ${call.id}`);
      } catch (error) {
        logger.error(`Error processing call ${call.id}:`, error);
        await db
          .update(calls)
          .set({ transcriptionStatus: 'failed' })
          .where(eq(calls.id, call.id));
      }
    }
    
    logger.info('Transcription processing completed');
  } catch (error) {
    logger.error('Error in transcription processing:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  processTranscriptions()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export default processTranscriptions;
