import axios from 'axios';
import logger from '../utils/logger';

const FMCSA_API_URL = process.env.FMCSA_API_URL!;
const FMCSA_API_KEY = process.env.FMCSA_API_KEY!;

const fmcsaClient = axios.create({
  baseURL: FMCSA_API_URL,
  headers: {
    Authorization: `Bearer ${FMCSA_API_KEY}`,
  },
});

export interface FMCSACarrier {
  dotNumber: number;
  legalName: string;
  dbaName: string | null;
  telephone: string;
  email: string | null;
  physicalStreet: string;
  physicalCity: string;
  physicalState: string;
  physicalZip: string;
  driverTotal: number;
  numberPowerUnit: number;
  cargoCarried?: any[];
}

export async function searchCarrierByPhone(phone: string): Promise<FMCSACarrier[]> {
  try {
    const response = await fmcsaClient.get('/api/carriers', {
      params: { telephone: phone, limit: 10 },
    });
    
    logger.info(`FMCSA search by phone ${phone}: ${response.data.data?.length || 0} results`);
    
    return response.data.data || [];
  } catch (error) {
    logger.error('Error searching FMCSA by phone:', error);
    throw error;
  }
}

export async function getCarrierByDOT(dotNumber: string): Promise<FMCSACarrier | null> {
  try {
    const response = await fmcsaClient.get(`/api/carriers/${dotNumber}`);
    
    logger.info(`FMCSA get carrier ${dotNumber}: ${response.data.legalName || 'not found'}`);
    
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    logger.error('Error fetching FMCSA carrier:', error);
    throw error;
  }
}
