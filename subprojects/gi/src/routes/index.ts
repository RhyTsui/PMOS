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

  return router;
}
