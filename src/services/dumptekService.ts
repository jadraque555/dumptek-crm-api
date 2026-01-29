import axios from 'axios';
import logger from '../utils/logger';

const DUMPTEK_API_URL = process.env.DUMPTEK_API_URL!;
const DUMPTEK_API_KEY = process.env.DUMPTEK_API_KEY!;

const dumptekClient = axios.create({
  baseURL: DUMPTEK_API_URL,
  headers: {
    token: DUMPTEK_API_KEY,
  },
});

export interface DumptekCompany {
  id: number;
  legalName: string;
  dotNumber: string;
  // ... other fields
}

export async function createDumptekCompany(prospectData: any): Promise<DumptekCompany> {
  try {
    const response = await dumptekClient.post('/api/companies', {
      legalName: prospectData.companyName,
      dotNumber: prospectData.dotNumber,
      phoneNumber: prospectData.phone,
      email: prospectData.email,
      // Map other fields as needed
    });
    
    logger.info(`Created Dumptek company: ${response.data.legalName}`);
    
    return response.data;
  } catch (error) {
    logger.error('Error creating Dumptek company:', error);
    throw error;
  }
}

export async function getDumptekCompany(companyId: number): Promise<DumptekCompany | null> {
  try {
    const response = await dumptekClient.get(`/api/companies/${companyId}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    logger.error('Error fetching Dumptek company:', error);
    throw error;
  }
}

export async function getStripeSubscription(companyId: number): Promise<any> {
  try {
    const response = await dumptekClient.get(`/api/stripe/subscription`, {
      params: { companyId },
    });
    return response.data;
  } catch (error) {
    logger.error('Error fetching Stripe subscription:', error);
    return null;
  }
}
