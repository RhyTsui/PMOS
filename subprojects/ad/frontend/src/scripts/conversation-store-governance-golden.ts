import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { addMessage, createConversation, listMessages, updateConversation } from '../src/lib/conversation-store';
import { runtimeUserDataPath } from '../src/lib/runtime-data-path';

async function main() {
  const brokenScope = `__conversation_store_governance_broken_${Date.now()}`;
  const brokenPath = runtimeUserDataPath(brokenScope, 'conversations.json');
  const brokenContent = '{ "conversations": [';
  await mkdir(path.dirname(brokenPath), { recursive: true });
  await writeFile(brokenPath, brokenContent, 'utf8');

  let blockedUnsafeOverwrite = false;
  try {
    await updateConversation('missing-conversation', { title: '不应写入' }, brokenScope);
  } catch (error) {
    blockedUnsafeOverwrite = error instanceof Error && error.message.includes('conversation_store_read_failed');
  }

  assert.equal(blockedUnsafeOverwrite, true, 'existing unreadable conversation store must block mutation');
  assert.equal(await readFile(brokenPath, 'utf8'), brokenContent, 'broken store must not be overwritten with an empty store');

  const healthyScope = `__conversation_store_governance_healthy_${Date.now()}`;
  const conversation = await createConversation(healthyScope, { title: '真实持久化护栏验证' });
  const userMessage = await addMessage(conversation.conversation_id, {
    role: 'user',
    content: '真实写入验证',
  }, healthyScope);
  const assistantMessage = await addMessage(conversation.conversation_id, {
    role: 'assistant',
    content: '已完成真实写入验证',
    metadata: {
      response_contract: {
        status: 'ok',
        evidence_mode: 'sufficient_evidence',
      },
    },
  }, healthyScope);

  const messages = await listMessages(conversation.conversation_id, healthyScope);
  assert.equal(messages.length, 2, 'healthy store should persist both user and assistant messages');
  assert.equal(messages[0].id, userMessage.id);
  assert.equal(messages[1].id, assistantMessage.id);

  console.log(JSON.stringify({
    status: 'pass',
    blockedUnsafeOverwrite,
    healthyConversationId: conversation.conversation_id,
    healthyMessageCount: messages.length,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
