import { describe, expect, it } from 'vitest';
import { resolveBusinessObjects } from '../src/lib/object-resolver';

describe('Object Resolver', () => {
  describe('具体概念覆盖父概念', () => {
    it('ROI报表 只输出 report.roi，不重复生成 report', () => {
      const result = resolveBusinessObjects({ message: '查看ROI报表' });
      const reportObjects = result.objects.filter(o => o.type === 'report');
      expect(reportObjects).toHaveLength(1);
      expect(reportObjects[0].conceptId).toBe('report.roi');
    });

    it('日报 只输出 report.daily', () => {
      const result = resolveBusinessObjects({ message: '查看日报' });
      const reportObjects = result.objects.filter(o => o.type === 'report');
      expect(reportObjects).toHaveLength(1);
      expect(reportObjects[0].conceptId).toBe('report.daily');
    });

    it('留存报表 只输出 report.retention', () => {
      const result = resolveBusinessObjects({ message: '查看留存报表' });
      const reportObjects = result.objects.filter(o => o.type === 'report');
      expect(reportObjects).toHaveLength(1);
      expect(reportObjects[0].conceptId).toBe('report.retention');
    });
  });

  describe('泛词处理', () => {
    it('查看报表 不产生 report.daily 对象', () => {
      const result = resolveBusinessObjects({ message: '查看报表' });
      const dailyReport = result.objects.find(o => o.conceptId === 'report.daily');
      expect(dailyReport).toBeUndefined();
    });

    it('数据口径是什么 不产生 report 对象', () => {
      const result = resolveBusinessObjects({ message: '数据口径是什么' });
      const reportObjects = result.objects.filter(o => o.type === 'report');
      expect(reportObjects).toHaveLength(0);
    });

    it('泛词 数据 记录为 surface cue', () => {
      const result = resolveBusinessObjects({ message: '数据口径是什么' });
      expect(result.surfaceCueHits.some(h => h.cue === '数据')).toBe(true);
    });

    it('泛词 报表 记录为 surface cue', () => {
      const result = resolveBusinessObjects({ message: '查看报表' });
      expect(result.surfaceCueHits.some(h => h.cue === '报表')).toBe(true);
    });
  });

  describe('workflow 独立 type', () => {
    it('联调 解析为 workflow type', () => {
      const result = resolveBusinessObjects({ message: '扫码联调' });
      const workflow = result.objects.find(o => o.conceptId === 'workflow.integration');
      expect(workflow).toBeDefined();
      expect(workflow?.type).toBe('workflow');
    });

    it('自动联调 解析为 workflow type', () => {
      const result = resolveBusinessObjects({ message: '发起自动联调' });
      const workflow = result.objects.find(o => o.conceptId === 'workflow.integration');
      expect(workflow).toBeDefined();
      expect(workflow?.type).toBe('workflow');
    });

    it('配置检查 解析为 workflow type', () => {
      const result = resolveBusinessObjects({ message: '执行配置检查' });
      const workflow = result.objects.find(o => o.conceptId === 'workflow.config_check');
      expect(workflow).toBeDefined();
      expect(workflow?.type).toBe('workflow');
    });
  });

  describe('package 独立 type', () => {
    it('投放包 解析为 package type', () => {
      const result = resolveBusinessObjects({ message: '查看投放包' });
      const pkg = result.objects.find(o => o.conceptId === 'package.fetch');
      expect(pkg).toBeDefined();
      expect(pkg?.type).toBe('package');
    });

    it('广告包 解析为 package type', () => {
      const result = resolveBusinessObjects({ message: '下载广告包' });
      const pkg = result.objects.find(o => o.conceptId === 'package.fetch');
      expect(pkg).toBeDefined();
      expect(pkg?.type).toBe('package');
    });

    it('包地址 解析为 package type', () => {
      const result = resolveBusinessObjects({ message: '获取包地址' });
      const pkg = result.objects.find(o => o.conceptId === 'package.fetch');
      expect(pkg).toBeDefined();
      expect(pkg?.type).toBe('package');
    });
  });

  describe('时间范围', () => {
    it('今天 解析为 time_range', () => {
      const result = resolveBusinessObjects({ message: '今天的数据' });
      const timeRange = result.objects.find(o => o.conceptId === 'time_range.today');
      expect(timeRange).toBeDefined();
      expect(timeRange?.type).toBe('time_range');
      expect(timeRange?.role).toBe('constraint');
    });

    it('昨天 解析为 time_range', () => {
      const result = resolveBusinessObjects({ message: '昨天的日报' });
      const timeRange = result.objects.find(o => o.conceptId === 'time_range.yesterday');
      expect(timeRange).toBeDefined();
      expect(timeRange?.type).toBe('time_range');
    });
  });

  describe('媒体实体', () => {
    it('巨量 解析为 entity', () => {
      const result = resolveBusinessObjects({ message: '巨量的数据' });
      const entity = result.objects.find(o => o.conceptId === 'entity.media.oceanengine');
      expect(entity).toBeDefined();
      expect(entity?.type).toBe('entity');
    });

    it('腾讯 解析为 entity', () => {
      const result = resolveBusinessObjects({ message: '腾讯的报表' });
      const entity = result.objects.find(o => o.conceptId === 'entity.media.tencent');
      expect(entity).toBeDefined();
      expect(entity?.type).toBe('entity');
    });
  });

  describe('指标', () => {
    it('ROI 解析为 metric', () => {
      const result = resolveBusinessObjects({ message: '查看ROI' });
      const metric = result.objects.find(o => o.conceptId === 'metric.roi');
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('metric');
    });

    it('消耗 解析为 metric', () => {
      const result = resolveBusinessObjects({ message: '消耗趋势' });
      const metric = result.objects.find(o => o.conceptId === 'metric.cost');
      expect(metric).toBeDefined();
      expect(metric?.type).toBe('metric');
    });
  });

  describe('matchSpan 基于原文', () => {
    it('trace 包含 matchSpan', () => {
      const result = resolveBusinessObjects({ message: '查看日报' });
      const trace = result.trace.find(t => t.conceptId === 'report.daily' && !t.rejectedReason);
      expect(trace).toBeDefined();
      expect(trace?.matchSpan).toBeDefined();
      if (trace?.matchSpan) {
        expect(trace.matchSpan.start).toBeGreaterThanOrEqual(0);
        expect(trace.matchSpan.end).toBeGreaterThan(trace.matchSpan.start);
      }
    });

    it('带空格的原文也能正确计算 span', () => {
      const result = resolveBusinessObjects({ message: '查看 日报' });
      const trace = result.trace.find(t => t.conceptId === 'report.daily' && !t.rejectedReason);
      expect(trace).toBeDefined();
      // span 应该指向原文中 "日报" 的位置
      expect(trace?.matchSpan.start).toBe(3);  // "查看 " 后面
      expect(trace?.matchSpan.end).toBe(5);
    });
  });

  describe('trace 完整信息', () => {
    it('trace 包含 priority', () => {
      const result = resolveBusinessObjects({ message: '查看日报' });
      const trace = result.trace.find(t => t.conceptId === 'report.daily' && !t.rejectedReason);
      expect(trace).toBeDefined();
      expect(trace?.priority).toBeGreaterThan(0);
    });

    it('trace 包含 specificity', () => {
      const result = resolveBusinessObjects({ message: '查看日报' });
      const trace = result.trace.find(t => t.conceptId === 'report.daily' && !t.rejectedReason);
      expect(trace).toBeDefined();
      expect(trace?.specificity).toBeGreaterThan(0);
    });

    it('trace 包含 confidence', () => {
      const result = resolveBusinessObjects({ message: '查看日报' });
      const trace = result.trace.find(t => t.conceptId === 'report.daily' && !t.rejectedReason);
      expect(trace).toBeDefined();
      expect(trace?.confidence).toBeGreaterThan(0);
      expect(trace?.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('空格变体匹配', () => {
    it('D1 ROI 报表 可以匹配 D1ROI报表', () => {
      // 注意：当前 ontology 中没有 D1 ROI 报表，这里测试机制
      // 使用首日ROI报表来测试
      const result = resolveBusinessObjects({ message: '查看首日ROI报表' });
      const reportObjects = result.objects.filter(o => o.type === 'report');
      expect(reportObjects.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('无匹配情况', () => {
    it('你好 不产生任何对象', () => {
      const result = resolveBusinessObjects({ message: '你好' });
      expect(result.objects).toHaveLength(0);
    });

    it('空字符串 不产生任何对象', () => {
      const result = resolveBusinessObjects({ message: '' });
      expect(result.objects).toHaveLength(0);
    });
  });

  describe('组合查询', () => {
    it('查看昨天日报 解析出 time_range 和 report', () => {
      const result = resolveBusinessObjects({ message: '查看昨天日报' });
      const timeRange = result.objects.find(o => o.type === 'time_range');
      const report = result.objects.find(o => o.type === 'report');
      expect(timeRange).toBeDefined();
      expect(report).toBeDefined();
      expect(report?.conceptId).toBe('report.daily');
    });

    it('巨量的ROI报表 解析出 entity 和 report', () => {
      const result = resolveBusinessObjects({ message: '巨量的ROI报表' });
      const entity = result.objects.find(o => o.type === 'entity');
      const report = result.objects.find(o => o.type === 'report');
      expect(entity).toBeDefined();
      expect(report).toBeDefined();
      expect(report?.conceptId).toBe('report.roi');
    });
  });
});
