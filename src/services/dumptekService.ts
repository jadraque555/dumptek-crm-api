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
  name: string;
  dotNumber: number | null;
  // ... other fields
}

export async function createDumptekCompany(prospectData: any): Promise<DumptekCompany> {
  try {
    const dotNumber = prospectData.dotNumber
      ? parseInt(String(prospectData.dotNumber), 10) || null
      : null;

    const companyName: string = prospectData.companyName;

    // The dumptek-api create endpoint is missing `await` on its DB transaction, so it
    // always responds with an empty body even though the company is saved. We create
    // the company then fetch it back by name to obtain the real ID.
    await dumptekClient.post('/api/companies', {
      name: companyName,
      dotNumber,
    });

    // Allow the background transaction to commit before querying
    await new Promise((resolve) => setTimeout(resolve, 300));

    const listResponse = await dumptekClient.get('/api/companies', {
      params: { name: companyName },
    });

    const companies: DumptekCompany[] = Array.isArray(listResponse.data)
      ? listResponse.data
      : [];

    // Exact-name match; highest ID = most recently created
    const company = companies
      .filter((c) => c.name === companyName)
      .sort((a, b) => b.id - a.id)[0];

    if (!company?.id) {
      throw new Error(`Could not find newly created company "${companyName}" in Dumptek`);
    }

    logger.info(`Created Dumptek company: ${company.name} (id: ${company.id})`);

    return company;
  } catch (error: any) {
    const detail = error.response?.data?.message ?? error.response?.data ?? error.message;
    logger.error('Error creating Dumptek company:', detail);
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
