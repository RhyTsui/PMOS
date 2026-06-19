/**
 * SimHash 实现
 *
 * 用于文本去重：计算文本的指纹哈希，相似度高的文本哈希值也接近
 *
 * @see docs/design/02-数据模型设计.md
 */

/**
 * 计算文本的 SimHash
 *
 * @param text - 输入文本
 * @param hashBits - 哈希位数（默认 64）
 * @returns SimHash 值（hex 字符串）
 */
export function computeSimHash(text: string, hashBits: number = 64): string {
  // 1. 分词（简单按空格和标点分割）
  const tokens = tokenize(text);

  // 2. 对每个 token 计算哈希
  // 3. 加权累加（hash 位为 1 则 +1，为 0 则 -1）
  const vector = new Array(hashBits).fill(0);

  for (const token of tokens) {
    const tokenHash = hashString(token, hashBits);
    for (let i = 0; i < hashBits; i++) {
      const bit = (tokenHash >> i) & 1;
      vector[i] += bit ? 1 : -1;
    }
  }

  // 4. 将累加结果转为二进制指纹
  let fingerprint = BigInt(0);
  for (let i = 0; i < hashBits; i++) {
    if (vector[i] > 0) {
      fingerprint |= BigInt(1) << BigInt(i);
    }
  }

  return fingerprint.toString(16).padStart(hashBits / 4, '0');
}

/**
 * 计算两个 SimHash 的汉明距离
 *
 * @param hash1 - 第一个哈希
 * @param hash2 - 第二个哈希
 * @returns 汉明距离（0 = 完全相同）
 */
export function hammingDistance(hash1: string, hash2: string): number {
  const h1 = BigInt('0x' + hash1);
  const h2 = BigInt('0x' + hash2);
  let xor = h1 ^ h2;
  let distance = 0;

  while (xor > 0) {
    distance += Number(xor & BigInt(1));
    xor >>= BigInt(1);
  }

  return distance;
}

/**
 * 计算两个 SimHash 的相似度
 *
 * @param hash1 - 第一个哈希
 * @param hash2 - 第二个哈希
 * @param hashBits - 哈希位数
 * @returns 相似度（0-1，1 = 完全相同）
 */
export function simHashSimilarity(hash1: string, hash2: string, hashBits: number = 64): number {
  const distance = hammingDistance(hash1, hash2);
  return 1 - distance / hashBits;
}

/**
 * 简单分词
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    // 中文按字分割，英文按词分割
    .replace(/[^一-龥a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 0);
}

/**
 * 字符串哈希（FNV-1a 变体）
 */
function hashString(str: string, bits: number): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  // 确保在 bits 范围内
  const mask = (1 << bits) - 1;
  return hash & mask;
}
