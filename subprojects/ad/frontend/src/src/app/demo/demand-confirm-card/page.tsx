'use client';

/**
 * DemandConfirmCard Demo - 需求确认卡片演示页面
 *
 * 展示 DemandConfirmCard 组件的不同状态和样式。
 */

import React, { useState } from 'react';
import { Card, Space, Button, message } from 'antd';
import DemandConfirmCard from '@/components/cognitive/DemandConfirmCard';
import type { DemandConfirmationCard } from '@/lib/demand-intake-confirmation';

// 示例数据：监测回传对接需求
const monitoringCallbackCard: DemandConfirmationCard = {
  markdown: '',
  structured: {
    serviceType: 'monitoring_callback',
    serviceDisplayName: '监测回传对接',
    slots: [
      { slotId: 'project', label: '项目/游戏', value: '三国志战略版', source: 'business_context' },
      { slotId: 'media', label: '媒体平台', value: '巨量引擎', source: 'business_context' },
      { slotId: 'integration_type', label: '对接类型', value: '监测+回传', source: 'message' },
      { slotId: 'document_url', label: '对接文档', value: 'https://example.com/doc', source: 'message' },
      { slotId: 'event_list', label: '回传事件清单', value: '激活、注册、付费', source: 'message' },
      { slotId: 'test_account', label: '测试账号', value: 'test@example.com', source: 'message' },
      { slotId: 'test_account_has_data', label: '测试账号是否有数据', value: '是', source: 'message' },
      { slotId: 'target_launch_date', label: '期望上线时间', value: '2026-07-01', source: 'message' },
      { slotId: 'contact', label: '联系人', value: '张三', source: 'message' },
    ],
    missingInputs: [],
    riskWarnings: [
      '请通过安全授权流程提交测试账号密码，不要在对话中发送明文。',
    ],
    artifacts: [
      { type: 'document_url', url: 'https://example.com/doc', title: '对接文档' },
    ],
    intakeDraftStatus: 'ready_for_confirmation',
  },
};

// 示例数据：采集数据需求
const dataCollectionCard: DemandConfirmationCard = {
  markdown: '',
  structured: {
    serviceType: 'data_collection',
    serviceDisplayName: '采集数据需求',
    slots: [
      { slotId: 'project', label: '项目/游戏', value: '原神', source: 'business_context' },
      { slotId: 'media', label: '媒体平台', value: '腾讯广告', source: 'message' },
      { slotId: 'data_source', label: '数据源', value: '后端接口', source: 'message' },
      { slotId: 'timeline', label: '期望上线时间', value: '2026-06-30', source: 'message' },
    ],
    missingInputs: [],
    riskWarnings: [],
    artifacts: [
      { type: 'document_url', url: 'https://example.com/api-doc', title: 'API 文档' },
    ],
    intakeDraftStatus: 'ready_for_confirmation',
  },
};

// 示例数据：信息不全的需求
const incompleteCard: DemandConfirmationCard = {
  markdown: '',
  structured: {
    serviceType: 'monitoring_callback',
    serviceDisplayName: '监测回传对接',
    slots: [
      { slotId: 'project', label: '项目/游戏', value: '王者荣耀', source: 'business_context' },
      { slotId: 'media', label: '媒体平台', value: '快手', source: 'message' },
    ],
    missingInputs: ['对接类型（监测/回传/监测+回传）', '对接文档', '授权方式或授权文档', '回传事件清单', '测试账号', '测试账号是否有数据'],
    riskWarnings: [],
    artifacts: [],
    intakeDraftStatus: 'collecting',
  },
};

export default function DemandConfirmCardDemo() {
  const [messageApi, contextHolder] = message.useMessage();

  const handleConfirm = (cardName: string) => {
    messageApi.success(`${cardName}需求单已创建！`);
  };

  const handleEdit = (cardName: string) => {
    messageApi.info(`正在编辑${cardName}需求信息...`);
  };

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: '0 auto' }}>
      <h1>DemandConfirmCard 组件演示</h1>
      <p>展示需求确认卡片的不同状态和样式。</p>

      {contextHolder}

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 示例 1：监测回传对接 - 信息齐全 */}
        <Card title="示例 1：监测回传对接需求（信息齐全）">
          <DemandConfirmCard
            card={monitoringCallbackCard}
            onConfirm={() => handleConfirm('监测回传对接')}
            onEdit={() => handleEdit('监测回传对接')}
            canConfirm={true}
          />
        </Card>

        {/* 示例 2：采集数据需求 - 信息齐全 */}
        <Card title="示例 2：采集数据需求（信息齐全）">
          <DemandConfirmCard
            card={dataCollectionCard}
            onConfirm={() => handleConfirm('采集数据')}
            onEdit={() => handleEdit('采集数据')}
            canConfirm={true}
          />
        </Card>

        {/* 示例 3：信息不全的需求 */}
        <Card title="示例 3：监测回传对接需求（信息不全）">
          <DemandConfirmCard
            card={incompleteCard}
            onConfirm={() => handleConfirm('监测回传对接')}
            onEdit={() => handleEdit('监测回传对接')}
            canConfirm={false}
          />
        </Card>

        {/* 使用说明 */}
        <Card title="使用说明">
          <h4>组件特性：</h4>
          <ul>
            <li>展示结构化的需求信息（项目、媒体、对接类型等）</li>
            <li>敏感信息（测试账号、授权方式）自动加密，不展示明文</li>
            <li>展示风险提示（如安全授权提示）</li>
            <li>展示关联产物（文档 URL 等）</li>
            <li>信息不全时展示缺失项列表</li>
            <li>提供确认和修改按钮</li>
            <li>信息不全时禁用确认按钮</li>
          </ul>

          <h4>使用示例：</h4>
          <pre style={{ background: '#f5f5f5', padding: 16, borderRadius: 4 }}>
{`import DemandConfirmCard from '@/components/cognitive/DemandConfirmCard';

<DemandConfirmCard
  card={confirmationCard}
  onConfirm={() => console.log('确认')}
  onEdit={() => console.log('修改')}
  canConfirm={true}
/>`}
          </pre>
        </Card>
      </Space>
    </div>
  );
}
