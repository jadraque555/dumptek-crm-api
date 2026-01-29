import { eq } from 'drizzle-orm';
import { db } from '../db';
import { prospects, calls, users } from '../db/schema';
import { CallAnalysis } from './openaiService';
import { searchCarrierByPhone, getCarrierByDOT } from './fmcsaService';
import logger from '../utils/logger';

export async function shouldAutoCreateProspect(analysis: CallAnalysis): boolean {
  return (
    analysis.is_prospect === true &&
    analysis.prospect_score >= 60 &&
    analysis.confidence_level === 'high' &&
    !['support_call', 'wrong_number', 'spam'].includes(analysis.call_classification)
  );
}

export async function needsReview(analysis: CallAnalysis): boolean {
  return (
    analysis.is_prospect === true &&
    ((analysis.prospect_score >= 40 && analysis.prospect_score < 60) ||
      analysis.confidence_level === 'medium' ||
      analysis.confidence_level === 'low')
  );
}

export async function autoCreateProspect(
  callId: number,
  phoneNumber: string,
  analysis: CallAnalysis
): Promise<number> {
  try {
    // Get call data
    const [call] = await db.select().from(calls).where(eq(calls.id, callId)).limit(1);
    
    if (!call) {
      throw new Error('Call not found');
    }
    
    // Try to enrich with FMCSA data
    let fmcsaData = null;
    const fmcsaCarriers = await searchCarrierByPhone(phoneNumber);
    if (fmcsaCarriers.length > 0) {
      fmcsaData = fmcsaCarriers[0];
    }
    
    // Assign to sales rep (round-robin or default)
    const assignedUserId = await getNextAvailableSalesRep();
    
    // Create prospect
    const [prospect] = await db
      .insert(prospects)
      .values({
        companyName: analysis.company_info.name || fmcsaData?.legalName || 'Unknown Company',
        phone: phoneNumber,
        dotNumber: fmcsaData?.dotNumber?.toString() || null,
        email: fmcsaData?.email || null,
        physicalStreet: fmcsaData?.physicalStreet || null,
        physicalCity: fmcsaData?.physicalCity || null,
        physicalState: fmcsaData?.physicalState || null,
        physicalZip: fmcsaData?.physicalZip || null,
        fleetSize: analysis.company_info.fleet_size || null,
        driverCount: fmcsaData?.driverTotal || null,
        fmcsaData: fmcsaData as any,
        source: 'call',
        initialCallId: callId,
        prospectScore: analysis.prospect_score,
        interestedServices: analysis.company_info.interested_services,
        painPoints: analysis.discussion_points.pain_points,
        timeline: analysis.discussion_points.timeline,
        status: 'new',
        assignedToUserId: assignedUserId,
      })
      .returning({ id: prospects.id });
    
    // Update call
    await db
      .update(calls)
      .set({
        prospectId: prospect.id,
        autoProspectCreated: true,
      })
      .where(eq(calls.id, callId));
    
    logger.info(`Auto-created prospect ${prospect.id} from call ${callId}`);
    
    return prospect.id;
  } catch (error) {
    logger.error('Error auto-creating prospect:', error);
    throw error;
  }
}

async function getNextAvailableSalesRep(): Promise<number | null> {
  // Simple round-robin: get sales rep with least prospects
  const salesReps = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isActive, true))
    .limit(1);
  
  return salesReps.length > 0 ? salesReps[0].id : null;
}

export async function enrichProspectWithFMCSA(
  prospectId: number,
  dotNumber?: string
): Promise<void> {
  try {
    const [prospect] = await db
      .select()
      .from(prospects)
      .where(eq(prospects.id, prospectId))
      .limit(1);
    
    if (!prospect) {
      throw new Error('Prospect not found');
    }
    
    const dot = dotNumber || prospect.dotNumber;
    if (!dot) {
      throw new Error('No DOT number provided');
    }
    
    const carrier = await getCarrierByDOT(dot);
    if (!carrier) {
      throw new Error('Carrier not found in FMCSA');
    }
    
    await db
      .update(prospects)
      .set({
        companyName: carrier.legalName || prospect.companyName,
        dotNumber: carrier.dotNumber.toString(),
        phone: carrier.telephone || prospect.phone,
        email: carrier.email || prospect.email,
        physicalStreet: carrier.physicalStreet,
        physicalCity: carrier.physicalCity,
        physicalState: carrier.physicalState,
        physicalZip: carrier.physicalZip,
        driverCount: carrier.driverTotal,
        fmcsaData: carrier as any,
        updatedAt: new Date(),
      })
      .where(eq(prospects.id, prospectId));
    
    logger.info(`Enriched prospect ${prospectId} with FMCSA data`);
  } catch (error) {
    logger.error('Error enriching prospect with FMCSA:', error);
    throw error;
  }
}
