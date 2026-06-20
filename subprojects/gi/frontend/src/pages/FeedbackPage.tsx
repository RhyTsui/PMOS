/**
 * 反馈管理页面
 *
 * 展示和管理同事提交的信源/种子反馈
 */
import { useEffect, useState } from 'react';
import { Table, Tag, Button, Space, Card, message, Modal, Input, Select, Tabs } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../services/api';

const { TextArea } = Input;
const { TabPane } = Tabs;

interface Feedback {
  id: string;
  type: 'source' | 'seed' | 'general';
  content: string;
  submitter?: string;
  contact?: string;
  status: 'pending' | 'processing' | 'accepted' | 'rejected';
  relatedIds?: string[];
  adminNotes?: string;
  createdAt: string;
}

export default function FeedbackPage() {
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFeedback, setSelectedFeedback] = useState<Feedback | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [adminNotes, setAdminNotes] = useState('');

  useEffect(() => {
    loadFeedbacks();
  }, []);

  const loadFeedbacks = async () => {
    setLoading(true);
    try {
      const res = await api.get('/feedback?limit=100') as any;
      setFeedbacks(Array.isArray(res) ? res : []);
    } catch (error) {
      console.error('Failed to load feedbacks:', error);
      message.error('加载反馈列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleView = (feedback: Feedback) => {
    setSelectedFeedback(feedback);
    setAdminNotes(feedback.adminNotes || '');
    setModalVisible(true);
  };

  const handleAccept = async () => {
    if (!selectedFeedback) return;
    try {
      await api.put(`/feedback/${selectedFeedback.id}/status`, {
        status: 'accepted',
        adminNotes,
      });
      message.success('反馈已接受');
      setModalVisible(false);
      loadFeedbacks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const handleReject = async () => {
    if (!selectedFeedback) return;
    try {
      await api.put(`/feedback/${selectedFeedback.id}/status`, {
        status: 'rejected',
        adminNotes,
      });
      message.success('反馈已拒绝');
      setModalVisible(false);
      loadFeedbacks();
    } catch (error) {
      message.error('操作失败');
    }
  };

  const getTypeTag = (type: string) => {
    const colors: Record<string, string> = {
      source: 'blue',
      seed: 'green',
      general: 'default',
    };
    const labels: Record<string, string> = {
      source: '信源',
      seed: '种子',
      general: '通用',
    };
    return <Tag color={colors[type]}>{labels[type]}</Tag>;
  };

  const getStatusTag = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'orange',
      processing: 'blue',
      accepted: 'green',
      rejected: 'red',
    };
    const labels: Record<string, string> = {
      pending: '待处理',
      processing: '处理中',
      accepted: '已接受',
      rejected: '已拒绝',
    };
    return <Tag color={colors[status]}>{labels[status]}</Tag>;
  };

  const columns = [
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: 100,
      render: (type: string) => getTypeTag(type),
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '提交人',
      dataIndex: 'submitter',
      key: 'submitter',
      width: 120,
      render: (submitter: string) => submitter || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => getStatusTag(status),
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: Feedback) => (
        <Button
          type="link"
          icon={<EyeOutlined />}
          onClick={() => handleView(record)}
        >
          查看
        </Button>
      ),
    },
  ];

  const pendingCount = feedbacks.filter(f => f.status === 'pending').length;

  return (
    <div style={{ padding: 24 }}>
      <Card
        title={
          <Space>
            <span>反馈管理</span>
            {pendingCount > 0 && (
              <Tag color="orange">{pendingCount} 条待处理</Tag>
            )}
          </Space>
        }
        extra={
          <Button onClick={loadFeedbacks} loading={loading}>
            刷新
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={feedbacks}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 20,
            showTotal: total => `共 ${total} 条反馈`,
          }}
        />
      </Card>

      <Modal
        title="反馈详情"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        width={700}
        footer={
          selectedFeedback?.status === 'pending' || selectedFeedback?.status === 'processing' ? (
            <Space>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
              <Button danger icon={<CloseOutlined />} onClick={handleReject}>
                拒绝
              </Button>
              <Button type="primary" icon={<CheckOutlined />} onClick={handleAccept}>
                接受
              </Button>
            </Space>
          ) : (
            <Button onClick={() => setModalVisible(false)}>关闭</Button>
          )
        }
      >
        {selectedFeedback && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <strong>类型：</strong>{getTypeTag(selectedFeedback.type)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>状态：</strong>{getStatusTag(selectedFeedback.status)}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>提交人：</strong>{selectedFeedback.submitter || '-'}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>联系方式：</strong>{selectedFeedback.contact || '-'}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>提交时间：</strong>{new Date(selectedFeedback.createdAt).toLocaleString('zh-CN')}
            </div>
            <div style={{ marginBottom: 16 }}>
              <strong>反馈内容：</strong>
              <div style={{
                marginTop: 8,
                padding: 12,
                background: '#f5f5f5',
                borderRadius: 4,
                whiteSpace: 'pre-wrap',
              }}>
                {selectedFeedback.content}
              </div>
            </div>
            {selectedFeedback.relatedIds && selectedFeedback.relatedIds.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <strong>关联 ID：</strong>
                <div style={{ marginTop: 8 }}>
                  {selectedFeedback.relatedIds.map(id => (
                    <Tag key={id}>{id}</Tag>
                  ))}
                </div>
              </div>
            )}
            {(selectedFeedback.status === 'pending' || selectedFeedback.status === 'processing') && (
              <div>
                <strong>管理员备注：</strong>
                <TextArea
                  rows={4}
                  value={adminNotes}
                  onChange={e => setAdminNotes(e.target.value)}
                  placeholder="可选：添加处理备注..."
                  style={{ marginTop: 8 }}
                />
              </div>
            )}
            {selectedFeedback.adminNotes && (
              <div style={{ marginTop: 16 }}>
                <strong>处理备注：</strong>
                <div style={{
                  marginTop: 8,
                  padding: 12,
                  background: '#fff7e6',
                  borderRadius: 4,
                  whiteSpace: 'pre-wrap',
                }}>
                  {selectedFeedback.adminNotes}
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
