import assert from 'node:assert/strict';
import { formatToolCallPayloadText } from '../src/renderers/disclosure/tool-call-payload-format';

function expectContains(name: string, input: unknown, expected: string[]) {
  const actual = formatToolCallPayloadText(input);
  for (const item of expected) {
    assert.ok(
      actual.includes(item),
      `${name} should contain ${JSON.stringify(item)}.\nActual:\n${actual}`,
    );
  }
}

expectContains('plain object', { code: 0, data: { rows: 2 } }, [
  '"code": 0',
  '"rows": 2',
]);

expectContains('json string', '{"code":0,"data":{"rows":2}}', [
  '"code": 0',
  '"rows": 2',
]);

expectContains('double encoded json string', '"{\\"code\\":0,\\"data\\":{\\"rows\\":2}}"', [
  '"code": 0',
  '"rows": 2',
]);

expectContains('escaped json fragment in text', '工具返回：{\\"code\\":0,\\"message\\":\\"ok\\"}', [
  '工具返回：',
  '"code": 0',
  '"message": "ok"',
]);

expectContains('keeps escaped quotes inside string values', '{\\"query\\":\\"name=\\\\\\"demo\\\\\\"\\"}', [
  '"query": "name=\\\\\\"demo\\\\\\""',
]);

expectContains('leaves non json text readable', 'INFO [step] no json payload', [
  'INFO [step] no json payload',
]);

expectContains('keeps text before non json bracket and later json', 'INFO [step] payload {"ok":true}', [
  'INFO [step] payload ',
  '"ok": true',
]);

console.log('tool-call payload format self-test passed');
