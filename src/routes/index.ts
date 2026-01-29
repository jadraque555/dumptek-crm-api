import Router from '@koa/router';
import * as authController from '../controllers/authController';
import * as callController from '../controllers/callController';
import * as prospectController from '../controllers/prospectController';
import { authMiddleware } from '../middleware/auth';
import { requireRole } from '../middleware/requireRole';

const router = new Router();

// Health check
router.get('/health', (ctx) => {
  ctx.body = { status: 'ok' };
});

// Auth routes
router.post('/api/auth/login', authController.login);
router.post('/api/auth/register', authMiddleware, authController.register);
router.get('/api/auth/me', authMiddleware, authController.me);

// Call routes
router.get('/api/calls', authMiddleware, callController.listCalls);
router.get('/api/calls/pending-review', authMiddleware, callController.getPendingReview);
router.get('/api/calls/:id', authMiddleware, callController.getCall);
router.post('/api/calls/:id/mark-prospect', authMiddleware, callController.markAsProspect);
router.post('/api/calls/:id/confirm-prospect', authMiddleware, callController.confirmProspect);
router.post('/api/calls/:id/reject-prospect', authMiddleware, callController.rejectProspect);

// Prospect routes
router.get('/api/prospects', authMiddleware, prospectController.listProspects);
router.get('/api/prospects/:id', authMiddleware, prospectController.getProspect);
router.post('/api/prospects', authMiddleware, prospectController.createProspect);
router.patch('/api/prospects/:id', authMiddleware, prospectController.updateProspect);
router.post(
  '/api/prospects/:id/enrich-fmcsa',
  authMiddleware,
  prospectController.enrichWithFMCSA
);
router.post(
  '/api/prospects/:id/promote',
  authMiddleware,
  requireRole('sales_manager'),
  prospectController.promoteToCustomer
);
router.get('/api/prospects/:id/stripe', authMiddleware, prospectController.getStripeInfo);

export default router;
