/**
 * 环境变量加载模块
 * 必须在所有其他模块之前导入，确保环境变量可用
 */
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 加载 .env 文件
const envPath = join(__dirname, '..', '..', '.env');
const result = dotenv.config({ path: envPath });

if (result.error) {
  console.warn('[ENV] .env 文件加载失败:', result.error.message);
} else {
  // 验证关键环境变量
  const required = ['QWEN_API_KEY'];
  const missing = required.filter(key => !process.env[key]);

  if (missing.length > 0) {
    console.warn('[ENV] 缺少关键环境变量:', missing.join(', '));
  } else {
    console.log('[ENV] 环境变量加载成功');
  }
}
