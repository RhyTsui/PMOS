'use client';

import { useState, useEffect } from 'react';
import { Drawer, Form, Input, Select, Button, Descriptions, Space, Divider, message } from 'antd';
import { EditOutlined, SaveOutlined, UndoOutlined } from '@ant-design/icons';
import type { TaskContext, MissingField } from '@/types';

interface ContextEditDrawerProps {
  open: boolean;
  taskContext: TaskContext | null;
  missingFields: MissingField[];
  onClose: () => void;
  onSave: (updatedContext: Partial<TaskContext>) => void;
}

export function ContextEditDrawer({
  open, taskContext, missingFields, onClose, onSave,
}: ContextEditDrawerProps) {
  const [form] = Form.useForm();
  const [editingMissing, setEditingMissing] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open && taskContext) {
      form.setFieldsValue({
        media: taskContext.media || '',
        app: taskContext.app || '',
        plan_id: taskContext.plan_id || '',
        device_id: taskContext.device_id || '',
        time_range: taskContext.time_range || '',
        anomaly_type: taskContext.anomaly_type || '',
        account: taskContext.account || '',
        target_date: taskContext.target_date || '',
      });
      setEditingMissing({});
    }
  }, [open, taskContext, form]);

  const handleSave = () => {
    const values = form.getFieldsValue();
    const allValues = { ...values };
    // Merge missing field edits
    Object.entries(editingMissing).forEach(([key, value]) => {
      if (value.trim()) (allValues as Record<string, string>)[key] = value.trim();
    });
    onSave(allValues);
    message.success('上下文已更新');
    onClose();
  };

  const mediaOptions = [
    { value: '巨量引擎', label: '巨量引擎' },
    { value: '抖音', label: '抖音' },
    { value: '快手', label: '快手' },
    { value: '百度', label: '百度' },
    { value: '腾讯广告', label: '腾讯广告' },
  ];

  return (
    <Drawer
      title="任务上下文编辑"
      open={open}
      onClose={onClose}
      size="default"
      styles={{
        header: {
          background: '#0d1117',
          borderBottom: '1px solid rgba(48,54,61,0.6)',
          color: '#c8d6e5',
        },
        body: {
          background: '#0d1117',
          padding: '16px 24px',
        },
        mask: {
          background: 'rgba(0,0,0,0.5)',
        },
      }}
      extra={
        <Space>
          <Button icon={<UndoOutlined />} onClick={() => form.resetFields()}>重置</Button>
          <Button type="primary" icon={<SaveOutlined />} onClick={handleSave}
            style={{ background: '#00D9FF', borderColor: '#00D9FF' }}>保存</Button>
        </Space>
      }
    >
      {/* Missing Fields Quick Fill */}
      {missingFields.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ color: '#FF3366', fontSize: 13, fontWeight: 500, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
            <EditOutlined />
            缺失字段补录 ({missingFields.length})
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {missingFields.map(field => (
              <div key={field.field_key} style={{
                padding: '8px 12px',
                background: 'rgba(255,51,102,0.06)',
                border: '1px solid rgba(255,51,102,0.15)',
                borderRadius: 8,
              }}>
                <div style={{ fontSize: 12, color: '#c8d6e5', marginBottom: 4 }}>
                  {field.field_label}
                  {field.priority === 'required' && <span style={{ color: '#FF3366', marginLeft: 4 }}>*</span>}
                </div>
                <div style={{ fontSize: 11, color: '#8b949e', marginBottom: 6 }}>{field.why_required}</div>
                <Input
                  size="small"
                  placeholder={field.suggested_question || `请输入${field.field_label}`}
                  value={editingMissing[field.field_key] || ''}
                  onChange={e => setEditingMissing(prev => ({ ...prev, [field.field_key]: e.target.value }))}
                  style={{ background: 'rgba(22,27,34,0.8)', borderColor: 'rgba(48,54,61,0.6)', color: '#c8d6e5' }}
                />
              </div>
            ))}
          </div>
          <Divider style={{ borderColor: 'rgba(48,54,61,0.4)' }} />
        </div>
      )}

      {/* Current Context */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ color: '#8b949e', fontSize: 12, marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
          <EditOutlined />
          当前上下文
        </div>
      </div>

      <Form form={form} layout="vertical" size="small">
        <Form.Item label="媒体平台" name="media">
          <Select options={mediaOptions} placeholder="选择媒体平台" allowClear
            style={{ background: 'rgba(22,27,34,0.8)' }} />
        </Form.Item>
        <Form.Item label="应用名称" name="app">
          <Input placeholder="如: com.example.app" />
        </Form.Item>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item label="计划ID" name="plan_id">
            <Input placeholder="广告计划ID" />
          </Form.Item>
          <Form.Item label="账户" name="account">
            <Input placeholder="广告账户ID" />
          </Form.Item>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Form.Item label="设备ID" name="device_id">
            <Input placeholder="设备标识" />
          </Form.Item>
          <Form.Item label="目标日期" name="target_date">
            <Select options={[
              { value: 'Android', label: 'Android' },
              { value: 'iOS', label: 'iOS' },
            ]} placeholder="选择OS" allowClear />
          </Form.Item>
        </div>
        <Form.Item label="时间范围" name="time_range">
          <Input placeholder="如: 2026-05-01 ~ 2026-05-09" />
        </Form.Item>
        <Form.Item label="异常类型" name="anomaly_type">
          <Select options={[
            { value: 'activation', label: '激活异常' },
            { value: 'payment', label: '付费异常' },
            { value: 'postback', label: '回传异常' },
            { value: 'attribution', label: '归因异常' },
            { value: 'bi_mismatch', label: 'BI不一致' },
          ]} placeholder="选择异常类型" allowClear />
        </Form.Item>
      </Form>
    </Drawer>
  );
}
