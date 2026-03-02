import Koa from 'koa';
import Router from '@koa/router';
import * as authController from '../controllers/authController';
import * as callController from '../controllers/callController';
import * as prospectController from '../controllers/prospectController';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = new Router<any, Koa.Context>({
  prefix: '/api',
});

// Health check
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

// Auth routes
router.post('/auth/login', authController.login);
router.post('/auth/register', authMiddleware, authController.register);
router.get('/auth/me', authMiddleware, authController.me);

// Call routes
router.get('/calls', authMiddleware, callController.listCalls);
router.get('/calls/pending-review', authMiddleware, callController.getPendingReview);
router.get('/calls/:id', authMiddleware, callController.getCall);
router.post('/calls/:id/mark-prospect', authMiddleware, callController.markAsProspect);
router.post('/calls/:id/confirm-prospect', authMiddleware, callController.confirmProspect);
router.post('/calls/:id/reject-prospect', authMiddleware, callController.rejectProspect);

// Prospect routes
router.get('/prospects', authMiddleware, prospectController.listProspects);
router.get('/prospects/:id', authMiddleware, prospectController.getProspect);
router.post('/prospects', authMiddleware, prospectController.createProspect);
router.patch('/prospects/:id', authMiddleware, prospectController.updateProspect);
router.post(
  '/prospects/:id/enrich-fmcsa',
  authMiddleware,
  prospectController.enrichWithFMCSA
);
router.post(
  '/prospects/:id/promote',
  authMiddleware,
  requireRole('sales_manager'),
  prospectController.promoteToCustomer
);
router.get('/prospects/:id/stripe', authMiddleware, prospectController.getStripeInfo);

export default router;
