/**
 * 采集器统一导出
 */
export { CollectorFactory, collectorFactory } from './base.js';
export type { Collector } from './base.js';
export { RssCollector, CollectorError } from './rss-collector.js';
export { PlaywrightCollector } from './playwright-collector.js';
export { ScraplingCollector } from './scrapling-collector.js';
export { CollectorRouter } from './router.js';
export type { CollectionResult } from './router.js';
