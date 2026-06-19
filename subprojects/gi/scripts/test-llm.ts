/**
 * LLM 连接测试脚本
 *
 * 测试公司网关 + Qwen3.5-397B 是否可用
 */
import dotenv from 'dotenv';
import { QwenClient } from '../src/lib/llm-client.js';

dotenv.config();

async function testLLM() {
  console.log('=== LLM 连接测试 ===\n');

  const apiKey = process.env.QWEN_API_KEY;
  const baseUrl = process.env.QWEN_BASE_URL;

  console.log('配置信息:');
  console.log(`  API Key: ${apiKey?.substring(0, 10)}...${apiKey?.substring(apiKey.length - 4)}`);
  console.log(`  Base URL: ${baseUrl}`);
  console.log();

  if (!apiKey) {
    console.log('❌ QWEN_API_KEY 未配置');
    return;
  }

  const client = new QwenClient({
    apiKey,
    baseUrl: baseUrl || 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    defaultModel: 'Qwen3.5-397B',
  });

  console.log('测试调用 Qwen3.5-397B...\n');

  try {
    // Make raw request to see response structure
    const rawResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'Qwen3.5-397B',
        messages: [{ role: 'user', content: '你好，请用一句话介绍你自己。' }],
        temperature: 0.7,
        max_tokens: 2000,  // 增加 token 限制，让模型有时间完成思考并给出答案
      }),
    });

    const rawData = await rawResponse.json();
    console.log('原始 API 响应:');
    console.log(JSON.stringify(rawData, null, 2));
    console.log('\n---\n');

    const response = await client.call({
      messages: [
        {
          role: 'user',
          content: '你好，请用一句话介绍你自己。',
        },
      ],
      temperature: 0.7,
      maxTokens: 2000,  // 增加 token 限制
    });

    console.log('✅ 调用成功!\n');
    console.log('完整响应:', JSON.stringify(response, null, 2));
    console.log('\n模型:', response.model);
    console.log('回复:', response.content);
    console.log('\nToken 使用:');
    console.log(`  Prompt: ${response.usage.promptTokens}`);
    console.log(`  Completion: ${response.usage.completionTokens}`);
    console.log(`  Total: ${response.usage.totalTokens}`);

  } catch (error) {
    console.log('❌ 调用失败\n');
    console.log('错误:', error instanceof Error ? error.message : String(error));

    // 如果是模型名称问题，尝试其他常见名称
    console.log('\n尝试其他模型名称...');

    const alternativeModels = [
      'qwen-3.5-397b',
      'qwen3-5-397b',
      'qwen3.5-397b-chat',
      'qwen-plus',
      'qwen-max',
    ];

    for (const model of alternativeModels) {
      console.log(`\n尝试模型: ${model}`);
      try {
        const response = await client.call({
          model,
          messages: [
            {
              role: 'user',
              content: '你好',
            },
          ],
          maxTokens: 50,
        });
        console.log(`✅ 成功! 模型 ${model} 可用`);
        console.log(`回复: ${response.content}`);
        console.log(`\n💡 建议将 .env 或代码中的模型名称改为: ${model}`);
        break;
      } catch (e) {
        console.log(`❌ ${model} 不可用: ${e instanceof Error ? e.message : String(e)}`);
      }
    }
  }
}

testLLM().catch(console.error);
