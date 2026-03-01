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

// Add request interceptor to log the exact URL
fmcsaClient.interceptors.request.use(
  (config) => {
    const fullUrl = `${config.baseURL}${config.url}${config.params ? '?' + new URLSearchParams(config.params).toString() : ''}`;
    logger.info(`[AXIOS] Full Request URL: ${fullUrl}`);
    logger.info(`[AXIOS] Headers: ${JSON.stringify(config.headers)}`);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

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
    const response = await fmcsaClient.get(`/api/carriers?telephone=${phone}&limit=10`);
    
    return response.data.data || [];
  } catch (error: any) {
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
