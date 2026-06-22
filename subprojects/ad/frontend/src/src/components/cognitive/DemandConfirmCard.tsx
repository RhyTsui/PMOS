/**
 * DemandConfirmCard - 需求确认卡片组件（P2）
 *
 * 展示结构化的需求信息，供用户确认。
 * 替代 P1 的 Markdown 确认卡，提供更好的交互体验。
 *
 * 功能：
 * - 展示需求类型、项目、媒体、对接类型等结构化信息
 * - 敏感信息（测试账号、授权方式）不展示明文
 * - 展示风险提示
 * - 提供确认/修改按钮
 * - 展示文档 URL 等产物
 */

import React from 'react';
import { Card, Button, Tag, Space, Typography, Alert, Divider, List } from 'antd';
import {
  CheckCircleOutlined,
  EditOutlined,
  WarningOutlined,
  LinkOutlined,
  LockOutlined,
} from '@ant-design/icons';
import type { DemandConfirmationCard } from '@/lib/demand-intake-confirmation';

const { Text, Title } = Typography;

export interface DemandConfirmCardProps {
  /** 确认卡数据 */
  card: DemandConfirmationCard;
  /** 确认回调 */
  onConfirm?: () => void;
  /** 修改回调 */
  onEdit?: () => void;
  /** 是否可确认 */
  canConfirm?: boolean;
}

/**
 * 需求确认卡片组件
 */
export const DemandConfirmCard: React.FC<DemandConfirmCardProps> = ({
  card,
  onConfirm,
  onEdit,
  canConfirm = true,
}) => {
  const { structured } = card;

  // 分离普通槽位和敏感槽位
  const normalSlots = structured.slots.filter(
    (slot) => !['test_account', 'auth_method'].includes(slot.slotId)
  );
  const sensitiveSlots = structured.slots.filter(
    (slot) => ['test_account', 'auth_method'].includes(slot.slotId)
  );

  return (
    <Card
      title={
        <Space>
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <span>{structured.serviceDisplayName}需求确认</span>
        </Space>
      }
      extra={
        <Tag color="blue">{structured.serviceType}</Tag>
      }
      style={{ maxWidth: 600, margin: '16px 0' }}
      actions={[
        <Button
          key="edit"
          icon={<EditOutlined />}
          onClick={onEdit}
        >
          修改信息
        </Button>,
        <Button
          key="confirm"
          type="primary"
          icon={<CheckCircleOutlined />}
          onClick={onConfirm}
          disabled={!canConfirm}
        >
          确认创建需求单
        </Button>,
      ]}
    >
      {/* 已识别信息 */}
      <Title level={5} style={{ marginTop: 0 }}>
        已识别信息
      </Title>
      <List
        size="small"
        dataSource={normalSlots}
        renderItem={(slot) => (
          <List.Item style={{ padding: '8px 0' }}>
            <Text strong style={{ minWidth: 120, display: 'inline-block' }}>
              {slot.label}：
            </Text>
            <Space>
              <Text>{slot.value}</Text>
              {slot.source && (
                <Tag color="default" style={{ fontSize: 11 }}>
                  来源: {slot.source === 'business_context' ? '业务上下文' : '消息'}
                </Tag>
              )}
            </Space>
          </List.Item>
        )}
      />

      {/* 敏感信息 */}
      {sensitiveSlots.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Title level={5}>
            <LockOutlined style={{ marginRight: 8 }} />
            敏感信息（已加密）
          </Title>
          <List
            size="small"
            dataSource={sensitiveSlots}
            renderItem={(slot) => (
              <List.Item style={{ padding: '8px 0' }}>
                <Text strong style={{ minWidth: 120, display: 'inline-block' }}>
                  {slot.label}：
                </Text>
                <Text type="secondary" italic>
                  ***（已加密，不在确认卡展示）
                </Text>
              </List.Item>
            )}
          />
        </>
      )}

      {/* 产物（文档 URL 等） */}
      {structured.artifacts.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Title level={5}>关联产物</Title>
          <List
            size="small"
            dataSource={structured.artifacts}
            renderItem={(artifact) => (
              <List.Item style={{ padding: '8px 0' }}>
                <Space>
                  <LinkOutlined />
                  {artifact.url ? (
                    <a href={artifact.url} target="_blank" rel="noopener noreferrer">
                      {artifact.title || artifact.url}
                    </a>
                  ) : (
                    <Text>{artifact.type}</Text>
                  )}
                </Space>
              </List.Item>
            )}
          />
        </>
      )}

      {/* 风险提示 */}
      {structured.riskWarnings.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Alert
            type="warning"
            showIcon
            icon={<WarningOutlined />}
            message="风险提示"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {structured.riskWarnings.map((warning, index) => (
                  <li key={index}>{warning}</li>
                ))}
              </ul>
            }
          />
        </>
      )}

      {/* 缺失项 */}
      {structured.missingInputs.length > 0 && (
        <>
          <Divider style={{ margin: '12px 0' }} />
          <Alert
            type="info"
            showIcon
            message="还需要补充以下信息"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {structured.missingInputs.map((input, index) => (
                  <li key={index}>{input}</li>
                ))}
              </ul>
            }
          />
        </>
      )}

      {/* 状态说明 */}
      <Divider style={{ margin: '12px 0' }} />
      <Text type="secondary" style={{ fontSize: 12 }}>
        {canConfirm
          ? '所有必填信息已齐全，确认后系统将创建需求单并关联到当前对话。'
          : '信息尚未齐全，请补充缺失信息后再确认。'}
      </Text>
    </Card>
  );
};

export default DemandConfirmCard;
