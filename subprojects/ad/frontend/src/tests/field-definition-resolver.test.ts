import { describe, expect, it } from 'vitest';
import { detectFieldDefinitionSignal } from '../src/lib/field-definition-resolver';

describe('field definition resolver', () => {
  describe('object + field pattern (high confidence)', () => {
    it('识别带对象的字段解释：素材报表的未知是什么', () => {
      const signal = detectFieldDefinitionSignal('素材报表的未知是什么');
      expect(signal.matched).toBe(true);
      expect(signal.targetObject).toBe('素材报表');
      expect(signal.targetTerm).toBe('未知');
      expect(signal.termRole).toBe('field_name');
      expect(signal.requiresClarification).toBe(false);
      expect(signal.confidence).toBe('high');
    });

    it('识别带对象的口径解释：ROI的口径怎么算', () => {
      const signal = detectFieldDefinitionSignal('ROI的口径怎么算');
      expect(signal.matched).toBe(true);
      expect(signal.targetObject).toBe('ROI');
      expect(signal.targetTerm).toBe('口径');
      expect(signal.termRole).toBe('field_name');
    });

    it('识别含义类问题：消耗的含义是什么', () => {
      const signal = detectFieldDefinitionSignal('消耗的含义是什么');
      expect(signal.matched).toBe(true);
      expect(signal.targetObject).toBe('消耗');
      expect(signal.targetTerm).toBe('含义');
    });

    it('排除含查数动词的对象：查询素材报表的数据', () => {
      const signal = detectFieldDefinitionSignal('查询素材报表的数据');
      expect(signal.matched).toBe(false);
    });

    it('排除纯数字术语', () => {
      const signal = detectFieldDefinitionSignal('报表的123是什么');
      expect(signal.matched).toBe(false);
    });
  });

  describe('term-only pattern (medium confidence, needs clarification)', () => {
    it('未知是什么意思 → requiresClarification=true', () => {
      const signal = detectFieldDefinitionSignal('未知是什么意思');
      expect(signal.matched).toBe(true);
      expect(signal.targetTerm).toBe('未知');
      expect(signal.termRole).toBe('unknown');
      expect(signal.requiresClarification).toBe(true);
      expect(signal.confidence).toBe('medium');
    });

    it('D1 ROI怎么理解 → requiresClarification=true', () => {
      const signal = detectFieldDefinitionSignal('D1 ROI怎么理解');
      expect(signal.matched).toBe(true);
      // Note: spaces are collapsed before matching, so term is "D1ROI"
      expect(signal.targetTerm).toBe('D1ROI');
      expect(signal.requiresClarification).toBe(true);
    });

    it('排除含查数动词的术语', () => {
      const signal = detectFieldDefinitionSignal('查消耗是什么');
      expect(signal.matched).toBe(false);
    });

    it('排除帮我/帮 前缀', () => {
      const signal = detectFieldDefinitionSignal('帮我看下ROI');
      expect(signal.matched).toBe(false);
    });
  });

  describe('diagnostic exclusion (should NOT match)', () => {
    it('为什么素材显示未知 → not matched (diagnostic)', () => {
      const signal = detectFieldDefinitionSignal('为什么素材显示未知');
      expect(signal.matched).toBe(false);
      expect(signal.reason).toBe('diagnostic_pattern_excluded');
    });

    it('为什么回传变成0 → not matched (diagnostic)', () => {
      const signal = detectFieldDefinitionSignal('为什么回传变成0');
      expect(signal.matched).toBe(false);
    });
  });

  describe('normal queries (should NOT match)', () => {
    it('今天素材报表的数据 → not matched', () => {
      const signal = detectFieldDefinitionSignal('今天素材报表的数据');
      expect(signal.matched).toBe(false);
    });

    it('查日报 → not matched', () => {
      const signal = detectFieldDefinitionSignal('查日报');
      expect(signal.matched).toBe(false);
    });

    it('最近7天的ROI趋势 → not matched', () => {
      const signal = detectFieldDefinitionSignal('最近7天的ROI趋势');
      expect(signal.matched).toBe(false);
    });

    it('空字符串 → not matched', () => {
      const signal = detectFieldDefinitionSignal('');
      expect(signal.matched).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('如何配置监测链接 → not matched (config help)', () => {
      const signal = detectFieldDefinitionSignal('如何配置监测链接');
      expect(signal.matched).toBe(false);
    });

    it('字段口径怎么计算 → not matched (no specific object)', () => {
      // This is a generic question without specific object
      const signal = detectFieldDefinitionSignal('字段口径怎么计算');
      // Should NOT match because 字段口径 is too generic
      expect(signal.matched).toBe(false);
    });
  });
});
