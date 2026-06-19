import { strict as assert } from 'node:assert';
import { resolveZhitouRoleMapping } from '../src/lib/zhitou-role-mapping';

const cases: Array<{ payload: Record<string, unknown>; expected?: string; hasExternalRole: boolean }> = [
  { payload: { role_name: '设计师' }, expected: 'designer', hasExternalRole: true },
  { payload: { roleName: '设计师主管' }, expected: 'designer', hasExternalRole: true },
  { payload: { roleName: '素材分析' }, expected: 'designer', hasExternalRole: true },
  { payload: { roleName: '投放' }, expected: 'optimizer', hasExternalRole: true },
  { payload: { roleName: '投放主管' }, expected: 'optimizer', hasExternalRole: true },
  { payload: { roleName: '观察员' }, expected: 'observer', hasExternalRole: true },
  { payload: { roleName: '其它角色' }, expected: 'optimizer', hasExternalRole: true },
  { payload: { roles: [123] }, expected: undefined, hasExternalRole: true },
  { payload: {}, expected: undefined, hasExternalRole: false },
];

for (const item of cases) {
  const result = resolveZhitouRoleMapping(item.payload);
  assert.equal(result.hasExternalRole, item.hasExternalRole, JSON.stringify(item.payload));
  assert.equal(result.mappedRoleId, item.expected, JSON.stringify(item.payload));
}

console.log(`role-mapping self-test passed: ${cases.length} cases`);
