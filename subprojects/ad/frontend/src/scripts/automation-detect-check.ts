import { detectAutomationIntent } from '../src/lib/automation-intent-router';

for (const message of ['每天9点帮我更新这个拼表', '每天9点帮我更新这个表', '今天天气怎么样']) {
  console.log(message, JSON.stringify(detectAutomationIntent({ message, history: [] })));
}
