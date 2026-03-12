import OpenAI from 'openai';
import fs from 'fs';
import logger from '../utils/logger';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function transcribeAudio(audioBuffer: Buffer, filename: string): Promise<string> {
  try {
    // Save buffer to temp file
    const tempPath = `./temp_${filename}`;
    fs.writeFileSync(tempPath, audioBuffer);
    
    const transcription = await openai.audio.transcriptions.create({
      file: fs.createReadStream(tempPath),
      model: 'whisper-1',
      language: 'en',
    });
    
    // Clean up temp file
    fs.unlinkSync(tempPath);
    
    logger.info(`Transcribed audio file: ${filename}`);
    
    return transcription.text;
  } catch (error) {
    logger.error('Error transcribing audio:', error);
    throw error;
  }
}

export interface CallAnalysis {
  is_prospect: boolean;
  prospect_score: number;
  confidence_level: 'high' | 'medium' | 'low';
  interest_indicators: string[];
  company_info: {
    name: string | null;
    contact_person: string | null;
    contact_title: string | null;
    industry: string | null;
    fleet_size: string | null;
    interested_services: string[];
  };
  discussion_points: {
    services: string[];
    pain_points: string[];
    budget_mentioned: boolean;
    timeline: string | null;
    competitors_mentioned: string[];
  };
  next_steps: string[];
  action_items: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  call_classification: string;
  summary: string;
}

export async function analyzeCallTranscription(transcriptionText: string): Promise<CallAnalysis> {
  try {
    const prompt = `Analyze this sales call transcription and extract the following information:

1. **Is this a potential prospect?** (yes/no/uncertain)
   - Answer YES if the caller shows interest in services, asks about pricing, 
     discusses business needs, or wants more information
   - Answer NO if it's a wrong number, spam, support call, or clearly not interested
   - Answer UNCERTAIN if you need more context

2. **Prospect Score** (0-100): How qualified is this lead?
   - 80-100: High interest, clear need, decision maker
   - 50-79: Moderate interest, needs follow-up
   - 20-49: Low interest or uncertain
   - 0-19: Not a prospect

3. **Interest Indicators:** List specific phrases showing interest

4. **Company Information:**
   - Company name (if mentioned)
   - Contact person name and title
   - Industry/business type
   - Fleet size (if mentioned)
   - Services they're interested in

5. **Key Discussion Points:**
   - Main services discussed
   - Pain points mentioned
   - Budget indicators
   - Timeline (when do they need service?)
   - Competition mentioned

6. **Next Steps:** What should the sales rep do next?

7. **Action Items/Notes:** Important notes for follow-up. Examples:
   - "Call back in 6 months"
   - "Already using [competitor software]"
   - "Not interested at this time"
   - "Waiting on budget approval"
   - "Send pricing information"

8. **Sentiment:** positive/neutral/negative

9. **Call Classification:**
   - sales_inquiry
   - pricing_request
   - demo_request
   - general_question
   - support_call
   - wrong_number
   - spam

Transcription: ${transcriptionText}

Respond in JSON format with these exact fields:
{
  "is_prospect": boolean,
  "prospect_score": number,
  "confidence_level": "high" | "medium" | "low",
  "interest_indicators": string[],
  "company_info": {
    "name": string | null,
    "contact_person": string | null,
    "contact_title": string | null,
    "industry": string | null,
    "fleet_size": string | null,
    "interested_services": string[]
  },
  "discussion_points": {
    "services": string[],
    "pain_points": string[],
    "budget_mentioned": boolean,
    "timeline": string | null,
    "competitors_mentioned": string[]
  },
  "next_steps": string[],
  "action_items": string[],
  "sentiment": "positive" | "neutral" | "negative",
  "call_classification": string,
  "summary": string
}`;

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    });
    
    const content = completion.choices[0].message.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }
    
    const analysis = JSON.parse(content) as CallAnalysis;
    
    logger.info('Call analysis completed', { 
      is_prospect: analysis.is_prospect, 
      score: analysis.prospect_score 
    });
    
    return analysis;
  } catch (error) {
    logger.error('Error analyzing call transcription:', error);
    throw error;
  }
}
