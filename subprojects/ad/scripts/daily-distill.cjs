#!/usr/bin/env node
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const adRoot = path.resolve(__dirname, '..');
const productRoot = path.join(adRoot, 'imported', 'projects');
const outputDir = path.join(adRoot, 'docs', 'review', 'daily');

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const item = argv[i];
    if (item === '--date') {
      args.date = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function todayInShanghai() {
  const now = new Date();
  const shanghai = new Date(now.getTime() + 8 * 60 * 60 * 1000);
  return shanghai.toISOString().slice(0, 10);
}

function localDate(timestamp) {
  const value = new Date(timestamp);
  if (Number.isNaN(value.getTime())) return '';
  const shanghai = new Date(value.getTime() + 8 * 60 * 60 * 1000);
  return shanghai.toISOString().slice(0, 10);
}

function run(command, args, cwd) {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    }).trim();
  } catch (error) {
    return '';
  }
}

function extractJson(stdout) {
  const firstArray = stdout.indexOf('[');
  const firstObject = stdout.indexOf('{');
  const startCandidates = [firstArray, firstObject].filter((item) => item >= 0);
  if (!startCandidates.length) return null;
  const start = Math.min(...startCandidates);
  const text = stdout.slice(start).trim();
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

function readEvents(date) {
  const stdout = run('npm.cmd', ['run', 'cli', '--', 'mcp-context', 'events', '200'], adRoot);
  const events = extractJson(stdout);
  if (!Array.isArray(events)) return [];
  return events
    .filter((event) => localDate(event.timestamp) === date)
    .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function readGitCommits(date, cwd) {
  if (!fs.existsSync(path.join(cwd, '.git'))) return [];
  const since = `${date}T00:00:00+08:00`;
  const until = `${date}T23:59:59+08:00`;
  const stdout = run('git', ['log', `--since=${since}`, `--until=${until}`, '--pretty=format:%h%x09%s'], cwd);
  return stdout
    ? stdout.split(/\r?\n/).filter(Boolean).map((line) => {
      const [hash, ...subject] = line.split('\t');
      return { hash, subject: subject.join('\t') };
    })
    : [];
}

function readActionItems(date) {
  const reviewPath = path.join(adRoot, 'docs', 'review', `智投chat-深度复盘-${date}.md`);
  if (!fs.existsSync(reviewPath)) return [];
  const content = fs.readFileSync(reviewPath, 'utf8');
  const rows = [];
  for (const line of content.split(/\r?\n/)) {
    const match = line.match(/^\|\s*(T-\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|/);
    if (!match) continue;
    if (match[1] === 'ID') continue;
    rows.push({
      id: match[1].trim(),
      title: match[2].trim(),
      requirement: match[3].trim(),
      acceptance: match[4].trim(),
      status: match[5].trim(),
    });
  }
  return rows;
}

function classifyEvents(events) {
  const started = [];
  const completed = [];
  const checkpoints = [];
  for (const event of events) {
    if (event.kind === 'task_started') started.push(event);
    else if (event.kind === 'task_completed') completed.push(event);
    else if (event.kind === 'checkpoint') checkpoints.push(event);
  }
  return { started, completed, checkpoints };
}

function summarizeCheckpoint(text) {
  return text
    .replace(/^ad-/, '')
    .replace(/-/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildMarkdown({ date, events, commits, productCommits, actionItems }) {
  const { started, completed, checkpoints } = classifyEvents(events);
  const keyCheckpoints = checkpoints.slice(-12);
  const solved = completed.length;
  const total = started.length;
  const openItems = actionItems.filter((item) => item.status !== 'done');
  const p0Items = openItems.filter((item) => /^T-00[1-8]$/.test(item.id));

  const lines = [];
  lines.push(`# 智投chat 每日蒸馏 - ${date}`);
  lines.push('');
  lines.push('## 结论');
  lines.push('');
  lines.push(`- 今日事件记录：${events.length} 条`);
  lines.push(`- 今日启动任务：${total} 个`);
  lines.push(`- 今日完成任务：${solved} 个`);
  lines.push(`- 待办清单：${openItems.length} 条，其中 P0 ${p0Items.length} 条`);
  lines.push(`- 产品归档提交：${productCommits.length ? productCommits.map((item) => `${item.hash} ${item.subject}`).join('；') : '未检测到当日产品仓库提交'}`);
  lines.push('');
  lines.push('## 关键进展');
  lines.push('');
  if (keyCheckpoints.length) {
    keyCheckpoints.forEach((event) => {
      lines.push(`- ${summarizeCheckpoint(event.content)}`);
    });
  } else {
    lines.push('- 今日没有检测到 checkpoint。');
  }
  lines.push('');
  lines.push('## 完成与验证');
  lines.push('');
  if (completed.length) {
    completed.forEach((event) => lines.push(`- ${event.content}`));
  } else {
    lines.push('- 未检测到 task-complete 事件。');
  }
  lines.push('');
  lines.push('## 待办');
  lines.push('');
  if (openItems.length) {
    lines.push('| ID | 待办 | 对应需求 | 完成标准 | 状态 |');
    lines.push('| --- | --- | --- | --- | --- |');
    openItems.forEach((item) => {
      lines.push(`| ${item.id} | ${item.title} | ${item.requirement} | ${item.acceptance} | ${item.status} |`);
    });
  } else {
    lines.push('- 未检测到待办表。');
  }
  lines.push('');
  lines.push('## 机制判断');
  lines.push('');
  lines.push('- mcp-context 事件采集可用，可以作为每日蒸馏输入源。');
  lines.push('- 当前日报由 `daily:distill` 生成，已具备固定输出目录和 action-items JSON。');
  lines.push('- 后续仍需把未完成项自动回写到任务系统，形成次日启动输入。');
  lines.push('');
  lines.push('## Git 记录');
  lines.push('');
  lines.push('### ad 工作区');
  if (commits.length) commits.forEach((item) => lines.push(`- ${item.hash} ${item.subject}`));
  else lines.push('- 未检测到当日提交。');
  lines.push('');
  lines.push('### 智投chat 产品仓库');
  if (productCommits.length) productCommits.forEach((item) => lines.push(`- ${item.hash} ${item.subject}`));
  else lines.push('- 未检测到当日提交。');
  lines.push('');
  return lines.join('\n');
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const date = args.date || todayInShanghai();
  fs.mkdirSync(outputDir, { recursive: true });

  const events = readEvents(date);
  const commits = readGitCommits(date, adRoot);
  const productCommits = readGitCommits(date, productRoot);
  const actionItems = readActionItems(date);

  const markdown = buildMarkdown({ date, events, commits, productCommits, actionItems });
  const mdPath = path.join(outputDir, `${date}.md`);
  const jsonPath = path.join(outputDir, `${date}.action-items.json`);

  fs.writeFileSync(mdPath, markdown, 'utf8');
  fs.writeFileSync(jsonPath, JSON.stringify({
    date,
    generated_at: new Date().toISOString(),
    source: {
      events: events.length,
      ad_commits: commits.length,
      product_commits: productCommits.length,
      review_file: `docs/review/智投chat-深度复盘-${date}.md`,
    },
    items: actionItems,
  }, null, 2), 'utf8');

  const checkpoint = `daily-distill-${date}-written`;
  run('npm.cmd', ['run', 'cli', '--', 'mcp-context', 'checkpoint', checkpoint, '--tool', 'codex'], adRoot);

  console.log(`日报已生成: ${mdPath}`);
  console.log(`待办已生成: ${jsonPath}`);
  console.log(`事件: ${events.length}, 待办: ${actionItems.length}`);
}

main();
