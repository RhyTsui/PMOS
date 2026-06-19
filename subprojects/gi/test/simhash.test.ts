/**
 * SimHash 单元测试
 */
import { describe, it, expect } from 'vitest';
import { computeSimHash, hammingDistance, simHashSimilarity } from '../src/lib/simhash.js';

describe('SimHash', () => {
  it('相同文本应该有相同的哈希', () => {
    const text = '这是一段测试文本，用于验证 SimHash 算法的正确性。';
    const hash1 = computeSimHash(text);
    const hash2 = computeSimHash(text);
    expect(hash1).toBe(hash2);
  });

  it('相似文本应该有较小的汉明距离', () => {
    const text1 = '米哈游原神4.0版本今日正式上线，新角色和全新地图让玩家期待已久';
    const text2 = '米哈游原神4.0版本今天正式上线，新增角色和全新地图让玩家期待';
    const text3 = '苹果公司今日召开新品发布会，iPhone 15系列搭载A17芯片性能大幅提升';

    const hash1 = computeSimHash(text1);
    const hash2 = computeSimHash(text2);
    const hash3 = computeSimHash(text3);

    const dist12 = hammingDistance(hash1, hash2);
    const dist13 = hammingDistance(hash1, hash3);

    // 相似文本的距离应该小于等于不相似文本
    expect(dist12).toBeLessThanOrEqual(dist13);
  });

  it('相似度计算正确', () => {
    const text1 = '游戏行业周报：本周多款新游上线';
    const text2 = '游戏行业周报：本周多款新游上线，市场反响良好';

    const hash1 = computeSimHash(text1);
    const hash2 = computeSimHash(text2);

    const similarity = simHashSimilarity(hash1, hash2);
    expect(similarity).toBeGreaterThan(0.7); // 相似文本相似度应该较高
  });

  it('空文本也能计算哈希', () => {
    const hash = computeSimHash('');
    expect(hash).toBeTruthy();
    expect(hash.length).toBe(16); // 64 bits = 16 hex chars
  });
});
