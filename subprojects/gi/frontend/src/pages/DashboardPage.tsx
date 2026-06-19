import { useEffect, useState } from 'react';
import { Card, Row, Col, Statistic, Tag } from 'antd';
import {
  FileTextOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import { systemApi, collectionApi } from '../services/api';
import type { SystemStatus } from '../services/api';

export default function DashboardPage() {
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [statusData, statsData] = await Promise.all([
        systemApi.status(),
        collectionApi.stats(),
      ]);
      setStatus(statusData);
      setStats(statsData);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>情报看板</h1>

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
              title="调度器状态"
              value={status?.scheduler?.isRunning ? '运行中' : '已停止'}
              prefix={<ThunderboltOutlined />}
              valueStyle={{ color: status?.scheduler?.isRunning ? '#3f8600' : '#cf1322' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="定时任务数"
              value={status?.scheduler?.jobCount || 0}
              prefix={<ClockCircleOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="今日采集"
              value={stats?.todayEvidence || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Card title="系统状态" style={{ marginTop: 24 }}>
        <p>调度任务：</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {status?.scheduler?.jobs.map((job) => (
            <Tag key={job} color="blue">{job}</Tag>
          ))}
        </div>
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
