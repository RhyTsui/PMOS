/**
 * Feedback Repository 单元测试
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FeedbackRepository } from '../src/repositories/feedback-repository.js';
import { initializeDatabase, getDatabase, closeDatabase } from '../src/lib/database.js';
import type { Feedback } from '../src/models/types.js';

describe('FeedbackRepository', () => {
  let repo: FeedbackRepository;

  beforeEach(() => {
    // 初始化数据库（确保表存在）
    initializeDatabase();
    // 每个测试前清空数据
    const db = getDatabase();
    db.exec('DELETE FROM feedback');
    repo = new FeedbackRepository();
  });

  afterEach(() => {
    // 清理测试数据
    const db = getDatabase();
    db.exec('DELETE FROM feedback');
  });

  it('创建反馈成功', () => {
    const feedback = repo.create({
      feedbackType: 'source',
      content: '建议添加 GameLook 作为信源，网址：https://www.gamelook.com.cn/',
      submitter: '测试用户',
      contact: 'test@example.com',
      status: 'pending',
    });

    expect(feedback).toBeDefined();
    expect(feedback.id).toBeDefined();
    expect(feedback.feedbackType).toBe('source');
    expect(feedback.content).toContain('GameLook');
    expect(feedback.submitter).toBe('测试用户');
    expect(feedback.status).toBe('pending');
  });

  it('按 ID 查询反馈', () => {
    const created = repo.create({
      feedbackType: 'seed',
      content: '建议添加"原神"作为游戏种子',
      status: 'pending',
    });

    const found = repo.findById(created.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.content).toBe('建议添加"原神"作为游戏种子');
  });

  it('按状态查询反馈', () => {
    repo.create({ feedbackType: 'source', content: '反馈1', status: 'pending' });
    repo.create({ feedbackType: 'seed', content: '反馈2', status: 'pending' });
    repo.create({ feedbackType: 'general', content: '反馈3', status: 'accepted' });

    const pending = repo.findByStatus('pending');
    expect(pending.length).toBe(2);

    const accepted = repo.findByStatus('accepted');
    expect(accepted.length).toBe(1);
  });

  it('按类型查询反馈', () => {
    repo.create({ feedbackType: 'source', content: '信源反馈1', status: 'pending' });
    repo.create({ feedbackType: 'source', content: '信源反馈2', status: 'pending' });
    repo.create({ feedbackType: 'seed', content: '种子反馈', status: 'pending' });

    const sources = repo.findByType('source');
    expect(sources.length).toBe(2);

    const seeds = repo.findByType('seed');
    expect(seeds.length).toBe(1);
  });

  it('统计各状态数量', () => {
    repo.create({ feedbackType: 'source', content: '反馈1', status: 'pending' });
    repo.create({ feedbackType: 'seed', content: '反馈2', status: 'pending' });
    repo.create({ feedbackType: 'general', content: '反馈3', status: 'accepted' });
    repo.create({ feedbackType: 'source', content: '反馈4', status: 'rejected' });

    const stats = repo.countByStatus();
    expect(stats.pending).toBe(2);
    expect(stats.accepted).toBe(1);
    expect(stats.rejected).toBe(1);
    expect(stats.processing).toBe(0);
  });

  it('更新反馈状态', () => {
    const feedback = repo.create({
      feedbackType: 'source',
      content: '建议添加信源',
      status: 'pending',
    });

    repo.updateStatus(feedback.id, 'accepted', '已采纳，添加到信源库');

    const updated = repo.findById(feedback.id);
    expect(updated?.status).toBe('accepted');
    expect(updated?.adminNotes).toBe('已采纳，添加到信源库');
    expect(updated?.processedAt).toBeDefined();
  });

  it('删除反馈', () => {
    const feedback = repo.create({
      feedbackType: 'source',
      content: '待删除的反馈',
      status: 'pending',
    });

    const deleted = repo.delete(feedback.id);
    expect(deleted).toBe(true);

    const found = repo.findById(feedback.id);
    expect(found).toBeNull();
  });

  it('查找所有反馈（带分页）', () => {
    // 创建 25 条反馈
    for (let i = 0; i < 25; i++) {
      repo.create({
        feedbackType: 'source',
        content: `反馈 ${i + 1}`,
        status: 'pending',
      });
    }

    const page1 = repo.findAll({ limit: 10, offset: 0 });
    expect(page1.length).toBe(10);

    const page2 = repo.findAll({ limit: 10, offset: 10 });
    expect(page2.length).toBe(10);

    const page3 = repo.findAll({ limit: 10, offset: 20 });
    expect(page3.length).toBe(5);
  });

  it('反馈内容可以为空（验证在 API 层进行）', () => {
    // Repository 层不做内容验证，这应该在 API 层处理
    const feedback = repo.create({
      feedbackType: 'source',
      content: '',
      status: 'pending',
    });

    expect(feedback).toBeDefined();
    expect(feedback.content).toBe('');
  });
});
