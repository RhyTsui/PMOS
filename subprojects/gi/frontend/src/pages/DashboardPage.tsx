/**
 * Dashboard 页面
 *
 * 情报看板，展示系统核心指标和趋势
 */
import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Tag, Space, List, Typography, Progress } from 'antd';
import {
  FileTextOutlined,
  CheckCircleOutlined,
  AlertOutlined,
  WarningOutlined,
  DatabaseOutlined,
  SafetyOutlined
} from '@ant-design/icons';
import { systemApi, collectionApi } from '../services/api';
import api from '../services/api';
import type { SystemStatus } from '../services/api';

const { Text } = Typography;

interface DashboardStats {
  todayEvidence: number;
  totalEvidence: number;
  evidenceByStatus: Record<string, number>;
  sourcesByPriority: Record<string, number>;
}

interface SourceHealth {
  total: number;
  healthy: number;
  degraded: number;
  down: number;
  unknown: number;
}

interface SignalStats {
  total: number;
  byStatus: Record<string, number>;
}

interface GapAlert {
  seedId: string;
  seedText: string;
  seedType: string;
  score: number;
  gapDays: number;
  severity: 'warning' | 'critical';
}

interface GapReport {
  gapsFound: number;
  summary: {
    critical: number;
    warning: number;
  };
  alerts: GapAlert[];
}

export default function DashboardPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [health, setHealth] = useState<SourceHealth | null>(null);
  const [signalStats, setSignalStats] = useState<SignalStats | null>(null);
  const [gapReport, setGapReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [statusData, statsData, healthData, signalData, gapData] = await Promise.all([
        systemApi.status(),
        collectionApi.stats(),
        api.get('/system/health').then(res => res as any),
        api.get('/signals/stats').then(res => res as any),
        api.get('/gaps').then(res => res as any),
      ]);
      setStatus(statusData);
      setStats(statsData);
      setHealth(healthData);
      setSignalStats(signalData);
      setGapReport(gapData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getHealthStatus = () => {
    if (!health) return { text: '未知', color: '#d9d9d9' };
    if (health.down > 0) return { text: '异常', color: '#f5222d' };
    if (health.degraded > 0) return { text: '降级', color: '#faad14' };
    return { text: '健康', color: '#52c41a' };
  };

  const healthStatus = getHealthStatus();

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>情报看板</h1>

      {/* 核心指标卡片 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="系统运行时间"
              value={status ? formatUptime(status.uptime) : '-'}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#3f8600' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日采集"
              value={stats?.todayEvidence || 0}
              prefix={<FileTextOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="总情报数"
              value={stats?.totalEvidence || 0}
              prefix={<DatabaseOutlined />}
              suffix="条"
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="源健康状态"
              value={healthStatus.text}
              prefix={<SafetyOutlined />}
              valueStyle={{ color: healthStatus.color }}
            />
          </Card>
        </Col>
      </Row>

      {/* 详细统计 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="源健康分布" size="small">
            {health ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>健康源</Text>
                  <Text strong style={{ color: '#52c41a' }}>{health.healthy}</Text>
                </div>
                <Progress
                  percent={health.total > 0 ? Math.round((health.healthy / health.total) * 100) : 0}
                  strokeColor="#52c41a"
                  showInfo={false}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                  <Text>降级源</Text>
                  <Text strong style={{ color: '#faad14' }}>{health.degraded}</Text>
                </div>
                <Progress
                  percent={health.total > 0 ? Math.round((health.degraded / health.total) * 100) : 0}
                  strokeColor="#faad14"
                  showInfo={false}
                />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 }}>
                  <Text>异常源</Text>
                  <Text strong style={{ color: '#f5222d' }}>{health.down}</Text>
                </div>
                <Progress
                  percent={health.total > 0 ? Math.round((health.down / health.total) * 100) : 0}
                  strokeColor="#f5222d"
                  showInfo={false}
                />
              </Space>
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="信号统计" size="small">
            {signalStats ? (
              <Space direction="vertical" style={{ width: '100%' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>总信号数</Text>
                  <Text strong>{signalStats.total}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>待处理</Text>
                  <Tag color="orange">{signalStats.byStatus.new || 0}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <Text>已推送</Text>
                  <Tag color="green">{signalStats.byStatus.dispatched || 0}</Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text>已消费</Text>
                  <Tag color="blue">{signalStats.byStatus.consumed || 0}</Tag>
                </div>
              </Space>
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* 采集状态分布 */}
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="采集状态分布" size="small">
            {stats?.evidenceByStatus ? (
              <Space wrap>
                {Object.entries(stats.evidenceByStatus).map(([status, count]) => (
                  <Tag key={status} color={getStatusColor(status)}>
                    {getStatusText(status)}: {count}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title="源优先级分布" size="small">
            {stats?.sourcesByPriority ? (
              <Space wrap>
                {Object.entries(stats.sourcesByPriority).map(([priority, count]) => (
                  <Tag key={priority} color={getPriorityColor(priority)}>
                    {priority}: {count}
                  </Tag>
                ))}
              </Space>
            ) : (
              <Text type="secondary">暂无数据</Text>
            )}
          </Card>
        </Col>
      </Row>

      {/* 漏采告警 */}
      {gapReport && gapReport.gapsFound > 0 && (
        <Card
          title={
            <Space>
              <AlertOutlined style={{ color: gapReport.summary.critical > 0 ? '#f5222d' : '#faad14' }} />
              <span>漏采告警 ({gapReport.gapsFound})</span>
            </Space>
          }
          size="small"
          style={{ marginTop: 16 }}
        >
          <List
            size="small"
            dataSource={gapReport.alerts.slice(0, 5)}
            renderItem={(alert) => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    alert.severity === 'critical' ? (
                      <AlertOutlined style={{ color: '#f5222d', fontSize: 20 }} />
                    ) : (
                      <WarningOutlined style={{ color: '#faad14', fontSize: 20 }} />
                    )
                  }
                  title={
                    <Space>
                      <Text strong>{alert.seedText}</Text>
                      <Tag color={alert.severity === 'critical' ? 'red' : 'orange'}>
                        {alert.severity === 'critical' ? '严重' : '警告'}
                      </Tag>
                    </Space>
                  }
                  description={
                    <Text type="secondary">
                      {alert.seedType} | 评分: {alert.score} | 已 {alert.gapDays} 天未产出
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
          {gapReport.gapsFound > 5 && (
            <div style={{ textAlign: 'center', marginTop: 8 }}>
              <Text type="secondary">还有 {gapReport.gapsFound - 5} 条告警...</Text>
            </div>
          )}
        </Card>
      )}

      {/* 调度任务 */}
      <Card title="调度任务" size="small" style={{ marginTop: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>调度器状态</Text>
            <Tag color={status?.scheduler?.isRunning ? 'green' : 'red'}>
              {status?.scheduler?.isRunning ? '运行中' : '已停止'}
            </Tag>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text>定时任务数</Text>
            <Text strong>{status?.scheduler?.jobCount || 0}</Text>
          </div>
          <div>
            <Text style={{ display: 'block', marginBottom: 8 }}>任务列表：</Text>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {status?.scheduler?.jobs.map((job) => (
                <Tag key={job} color="blue">{formatJobName(job)}</Tag>
              ))}
            </div>
          </div>
        </Space>
      </Card>
    </div>
  );
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}天 ${hours}小时`;
  if (hours > 0) return `${hours}小时 ${mins}分钟`;
  return `${mins}分钟`;
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    collected: 'blue',
    extracted: 'green',
    failed: 'red',
    duplicate: 'orange',
  };
  return colors[status] || 'default';
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    collected: '已采集',
    extracted: '已抽取',
    failed: '失败',
    duplicate: '重复',
  };
  return texts[status] || status;
}

function getPriorityColor(priority: string): string {
  const colors: Record<string, string> = {
    P0: 'red',
    P1: 'orange',
    P2: 'blue',
    P3: 'default',
  };
  return colors[priority] || 'default';
}

function formatJobName(job: string): string {
  const names: Record<string, string> = {
    'health-check': '健康检查',
    'seed-evolution': '种子进化',
    'cleanup': '清理任务',
    'gap-detection': '漏采检测',
    'source-discovery': '源发现',
    'daily-report': '每日报告',
  };
  return names[job] || job;
}
