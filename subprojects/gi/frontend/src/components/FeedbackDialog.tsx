/**
 * 反馈提交弹窗
 */
import { useState } from 'react';
import { Modal, Form, Input, message } from 'antd';
import api from '../services/api';

const { TextArea } = Input;

interface FeedbackDialogProps {
  visible: boolean;
  feedbackType: 'source' | 'seed';
  onClose: () => void;
  onSuccess: () => void;
}

export default function FeedbackDialog({ visible, feedbackType, onClose, onSuccess }: FeedbackDialogProps) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setSubmitting(true);

      await api.post('/feedback', {
        feedbackType,
        content: values.content,
        submitter: values.submitter,
        contact: values.contact,
        relatedIds: values.relatedIds ? values.relatedIds.split(',').map((id: string) => id.trim()) : [],
      });

      message.success('反馈提交成功，感谢您的贡献！');
      form.resetFields();
      onSuccess();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      message.error('提交失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={
        <span>
          提交{feedbackType === 'source' ? '信源' : '种子'}反馈
        </span>
      }
      open={visible}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={submitting}
      okText="提交"
      cancelText="取消"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        autoComplete="off"
      >
        <Form.Item
          name="content"
          label="反馈内容"
          rules={[
            { required: true, message: '请输入反馈内容' },
            { min: 10, message: '反馈内容至少需要10个字符' },
          ]}
          extra={
            <span style={{ fontSize: 12, color: '#999' }}>
              请详细描述您建议添加的信源/种子，包括名称、网址、类型、理由等。
              多条建议请用换行分隔。
            </span>
          }
        >
          <TextArea
            rows={8}
            placeholder={`示例：
信源名称：游戏葡萄
网址：https://youxiputao.com/
类型：行业媒体
理由：国内领先的游戏行业媒体，覆盖新游资讯、深度分析、数据报告等

---

种子名称：原神
类型：游戏实体
别名：Genshin Impact, 原神
分类：开放世界
理由：米哈游旗舰产品，全球热门开放世界游戏`}
            maxLength={5000}
            showCount
          />
        </Form.Item>

        <Form.Item
          name="submitter"
          label="提交人"
          extra="可选，用于后续沟通"
        >
          <Input placeholder="您的姓名或工号" maxLength={100} />
        </Form.Item>

        <Form.Item
          name="contact"
          label="联系方式"
          extra="可选，方便我们与您确认细节"
        >
          <Input placeholder="邮箱、企业微信或其他联系方式" maxLength={200} />
        </Form.Item>

        <Form.Item
          name="relatedIds"
          label="关联 ID"
          extra="可选，如果您想针对特定的信源/种子提出反馈，请提供其 ID（多个用逗号分隔）"
        >
          <Input placeholder="例如：abc123, def456" maxLength={500} />
        </Form.Item>

        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <div style={{ fontSize: 12, color: '#666' }}>
            <strong>💡 提示：</strong>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              <li>您的反馈将帮助我们一起完善情报系统</li>
              <li>后续可与小乔智投对接，实现自动化双向拓展</li>
              <li>管理员会定期审核并处理反馈</li>
            </ul>
          </div>
        </div>
      </Form>
    </Modal>
  );
}
