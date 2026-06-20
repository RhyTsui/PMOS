/**
 * 漏采告警页面
 *
 * 展示漏采检测结果，快速定位问题
 */
import { useEffect, useState } from 'react';
import { Table, Tag, Card, Space, Statistic, Row, Col, Button, message, Alert, Descriptions } from 'antd';
import { WarningOutlined, ReloadOutlined, AlertOutlined } from '@ant-design/icons';
import api from '../services/api';

interface GapAlert {
  seedId: string;
  seedText: string;
  seedType: string;
  score: number;
  lastUsedAt: string | null;
  gapDays: number;
  severity: 'warning' | 'critical';
  suggestion: string;
}

interface GapReport {
  detectedAt: string;
  totalSeedsChecked: number;
  gapsFound: number;
  alerts: GapAlert[];
  summary: {
    critical: number;
    warning: number;
  };
}

export default function GapDetectionPage() {
  const [report, setReport] = useState<GapReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    runDetection();
  }, []);

  const runDetection = async () => {
    setLoading(true);
    try {
      const res = await api.get('/gaps') as any;
      setReport(res);
    } catch (error) {
      console.error('Failed to run gap detection:', error);
      message.error('漏采检测失败');
    } finally {
      setLoading(false);
    }
  };

  const getSeverityTag = (severity: string) => {
    if (severity === 'critical') {
      return <Tag color="red" icon={<AlertOutlined />}>严重</Tag>;
    }
    return <Tag color="orange" icon={<WarningOutlined />}>警告</Tag>;
  };

  const getSeedTypeTag = (type: string) => {
    const colors: Record<string, string> = {
      entity: 'blue',
      event: 'green',
      topic: 'purple',
      source: 'cyan',
    };
    const labels: Record<string, string> = {
      entity: '实体',
      event: '事件',
      topic: '话题',
      source: '源',
    };
    return <Tag color={colors[type]}>{labels[type]}</Tag>;
  };

  const columns = [
    {
      title: '严重度',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity: string) => getSeverityTag(severity),
    },
    {
      title: '种子文本',
      dataIndex: 'seedText',
      key: 'seedText',
      width: 200,
    },
    {
      title: '种子类型',
      dataIndex: 'seedType',
      key: 'seedType',
      width: 100,
      render: (type: string) => getSeedTypeTag(type),
    },
    {
      title: '种子评分',
      dataIndex: 'score',
      key: 'score',
      width: 100,
      render: (score: number) => (
        <span style={{ color: score >= 80 ? '#52c41a' : score >= 50 ? '#faad14' : '#f5222d' }}>
          {score}
        </span>
      ),
    },
    {
      title: '未产出天数',
      dataIndex: 'gapDays',
      key: 'gapDays',
      width: 120,
      render: (days: number) => (
        <span style={{ color: days >= 14 ? '#f5222d' : '#faad14', fontWeight: 'bold' }}>
          {days} 天
        </span>
      ),
    },
    {
      title: '最后使用时间',
      dataIndex: 'lastUsedAt',
      key: 'lastUsedAt',
      width: 180,
      render: (date: string | null) =>
        date ? new Date(date).toLocaleString('zh-CN') : '从未使用',
    },
    {
      title: '建议',
      dataIndex: 'suggestion',
      key: 'suggestion',
      ellipsis: true,
    },
  ];

  const criticalAlerts = report?.alerts.filter(a => a.severity === 'critical') || [];
  const warningAlerts = report?.alerts.filter(a => a.severity === 'warning') || [];

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <span>漏采检测</span>
            {report && (
              <Tag color={report.summary.critical > 0 ? 'red' : 'orange'}>
                {report.gapsFound} 个漏采
              </Tag>
            )}
          </Space>
        }
        extra={
          <Button
            icon={<ReloadOutlined />}
            onClick={runDetection}
            loading={loading}
          >
            重新检测
          </Button>
        }
      >
        {report && (
          <>
            {report.summary.critical > 0 && (
              <Alert
                message="存在严重漏采"
                description={`发现 ${report.summary.critical} 个高分种子长期未产出，请及时处理`}
                type="error"
                showIcon
                style={{ marginBottom: 16 }}
              />
            )}

            <Row gutter={16} style={{ marginBottom: 24 }}>
              <Col span={6}>
                <Statistic
                  title="检查种子数"
                  value={report.totalSeedsChecked}
                  suffix="个"
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="漏采数"
                  value={report.gapsFound}
                  suffix="个"
                  valueStyle={{ color: report.gapsFound > 0 ? '#cf1322' : '#3f8600' }}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="严重漏采"
                  value={report.summary.critical}
                  suffix="个"
                  valueStyle={{ color: report.summary.critical > 0 ? '#cf1322' : undefined }}
                  prefix={report.summary.critical > 0 ? <AlertOutlined /> : undefined}
                />
              </Col>
              <Col span={6}>
                <Statistic
                  title="警告漏采"
                  value={report.summary.warning}
                  suffix="个"
                  valueStyle={{ color: report.summary.warning > 0 ? '#faad14' : undefined }}
                  prefix={report.summary.warning > 0 ? <WarningOutlined /> : undefined}
                />
              </Col>
            </Row>

            <div style={{ marginBottom: 16, color: '#999', fontSize: 12 }}>
              检测时间：{new Date(report.detectedAt).toLocaleString('zh-CN')}
            </div>

            {criticalAlerts.length > 0 && (
              <>
                <h3 style={{ color: '#f5222d', marginBottom: 12 }}>
                  <AlertOutlined /> 严重漏采（{criticalAlerts.length} 个）
                </h3>
                <Table
                  columns={columns}
                  dataSource={criticalAlerts}
                  rowKey="seedId"
                  pagination={false}
                  size="small"
                  style={{ marginBottom: 24 }}
                  expandable={{
                    expandedRowRender: (record) => (
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="建议">{record.suggestion}</Descriptions.Item>
                      </Descriptions>
                    ),
                  }}
                />
              </>
            )}

            {warningAlerts.length > 0 && (
              <>
                <h3 style={{ color: '#faad14', marginBottom: 12 }}>
                  <WarningOutlined /> 警告漏采（{warningAlerts.length} 个）
                </h3>
                <Table
                  columns={columns}
                  dataSource={warningAlerts}
                  rowKey="seedId"
                  pagination={{
                    pageSize: 20,
                    showTotal: total => `共 ${total} 个警告`,
                  }}
                  size="small"
                  expandable={{
                    expandedRowRender: (record) => (
                      <Descriptions column={1} size="small">
                        <Descriptions.Item label="建议">{record.suggestion}</Descriptions.Item>
                      </Descriptions>
                    ),
                  }}
                />
              </>
            )}

            {report.gapsFound === 0 && (
              <Alert
                message="无漏采"
                description="所有高分种子均正常产出，系统运行良好"
                type="success"
                showIcon
              />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
