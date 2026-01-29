import twilio from 'twilio';
import logger from '../utils/logger';

const accountSid = process.env.TWILIO_ACCOUNT_SID!;
const authToken = process.env.TWILIO_AUTH_TOKEN!;

// Lazy initialization - only create client when needed
let client: ReturnType<typeof twilio> | null = null;

function getTwilioClient() {
  if (!client) {
    // Check if credentials are configured (not placeholder values)
    if (!accountSid || !accountSid.startsWith('AC')) {
      logger.warn('Twilio credentials not configured. Twilio features will be disabled.');
      throw new Error('Twilio credentials not configured');
    }
    client = twilio(accountSid, authToken);
    logger.info('Twilio client initialized successfully');
  }
  return client;
}

export interface TwilioCall {
  sid: string;
  from: string;
  to: string;
  duration: string;
  direction: string;
  status: string;
  startTime: Date;
}

export async function fetchRecentCalls(
  startDate: Date,
  limit: number = 100
): Promise<TwilioCall[]> {
  try {
    const twilioClient = getTwilioClient();
    const calls = await twilioClient.calls.list({
      startTime: startDate,
      limit,
    });
    
    logger.info(`Fetched ${calls.length} calls from Twilio`);
    
    return calls.map(call => ({
      sid: call.sid,
      from: call.from,
      to: call.to,
      duration: call.duration || '0',
      direction: call.direction,
      status: call.status,
      startTime: call.startTime ? new Date(call.startTime) : new Date(),
    }));
  } catch (error) {
    logger.error('Error fetching calls from Twilio:', error);
    throw error;
  }
}

export async function getRecordingUrl(callSid: string): Promise<string | null> {
  try {
    const twilioClient = getTwilioClient();
    const recordings = await twilioClient.recordings.list({ callSid, limit: 1 });
    
    if (recordings.length === 0) {
      return null;
    }
    
    const recording = recordings[0];
    return `https://api.twilio.com${recording.uri.replace('.json', '.mp3')}`;
  } catch (error) {
    logger.error(`Error fetching recording for call ${callSid}:`, error);
    return null;
  }
}

export async function downloadRecording(recordingUrl: string): Promise<Buffer> {
  try {
    const response = await fetch(recordingUrl, {
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to download recording: ${response.statusText}`);
    }
    
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    logger.error('Error downloading recording:', error);
    throw error;
  }
}
