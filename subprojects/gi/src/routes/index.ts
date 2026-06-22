/**
 * API 路由统一入口
 */
import { Router } from 'express';
import { sourcesRouter } from './sources.js';
import { seedsRouter } from './seeds.js';
import { evidenceRouter } from './evidence.js';
import { collectionRouter } from './collection.js';
import { extractionRouter } from './extraction.js';
import { pipelineRouter } from './pipeline.js';
import { systemRouter } from './system.js';
import { datakiRouter } from './dataki.js';
import { eventsRouter } from './events.js';
import { gapDetectionRouter } from './gaps.js';
import { signalsRouter } from './signals.js';
import { feedbackRouter } from './feedback.js';
import { sourceDiscoveryRouter } from './source-discovery.js';
import { rsshubRouter } from './rsshub.js';
import { weweRouter } from './wewe.js';
import { dailyReportRouter } from './daily-report.js';
import { trendsRouter } from './trends.js';
// VNext 路由
import { profilesRouter } from './profiles.js';
import { ledgerRouter } from './ledger.js';
import { intelligenceRouter } from './intelligence.js';
import { modelRouter } from './model.js';
import { llmProvidersRouter } from './llm-providers.js';
import { distillationRouter } from './distillation.js';

export function createApiRouter(): Router {
  const router = Router();

  router.use('/sources', sourcesRouter);
  router.use('/seeds', seedsRouter);
  router.use('/evidence', evidenceRouter);
  router.use('/collection', collectionRouter);
  router.use('/extraction', extractionRouter);
  router.use('/pipeline', pipelineRouter);
  router.use('/system', systemRouter);
  router.use('/dataki', datakiRouter);
  router.use('/events', eventsRouter);
  router.use('/gaps', gapDetectionRouter);
  router.use('/signals', signalsRouter);
  router.use('/feedback', feedbackRouter);
  router.use('/source-discovery', sourceDiscoveryRouter);
  router.use('/rsshub', rsshubRouter);
  router.use('/wewe', weweRouter);
  router.use('/daily-report', dailyReportRouter);
  router.use('/trends', trendsRouter);

  // VNext 路由
  router.use('/profiles', profilesRouter);
  router.use('/ledger', ledgerRouter);
  router.use('/intelligence', intelligenceRouter);
  router.use('/model', modelRouter);
  router.use('/admin/llm-providers', llmProvidersRouter);
  router.use('/distillation', distillationRouter);

  return router;
}
