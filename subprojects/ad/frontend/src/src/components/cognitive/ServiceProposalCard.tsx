'use client';

import React, { useState } from 'react';
import {
  BulbOutlined,
  CheckCircleOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons';
import type { ServiceProposal } from '@/contracts/service-proposal';

// ─── Props ─────────────────────────────────────────────

interface ServiceProposalCardProps {
  proposal: ServiceProposal;
  /** 用户点击"执行"某个服务 */
  onExecute?: (serviceType: string) => void;
  /** 用户点击"补充信息" */
  onProvideInput?: (field: string) => void;
  /** 用户确认可以开始 */
  onConfirm?: () => void;
  /** 用户拒绝/取消 */
  onCancel?: () => void;
}

// ─── Component ─────────────────────────────────────────

export function ServiceProposalCard({
  proposal,
  onExecute,
  onProvideInput,
  onConfirm,
  onCancel,
}: ServiceProposalCardProps) {
  const [expanded, setExpanded] = useState(true);

  const canExecute = proposal.missingInputs.length === 0 && !proposal.requiresConfirmation;
  const primaryService = proposal.recommendedServices[0];

  return (
    <div
      style={{
        marginTop: 12,
        borderRadius: 14,
        border: '1px solid #d7e3f5',
        background: 'linear-gradient(135deg, #f7fbff 0%, #ffffff 100%)',
        padding: '14px 16px',
        boxShadow: '0 2px 8px rgba(15, 111, 255, 0.06)',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
          cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ThunderboltOutlined style={{ color: '#0f6fff', fontSize: 16 }} />
          <span style={{ fontSize: 14, fontWeight: 600, color: '#10233f' }}>
            服务提案
          </span>
          {proposal.priority === 'high' && (
            <span
              style={{
                fontSize: 10,
                padding: '2px 6px',
                borderRadius: 4,
                background: '#fff1f0',
                color: '#cf1322',
                fontWeight: 500,
              }}
            >
              推荐
            </span>
          )}
        </div>
        <RightOutlined
          style={{
            fontSize: 12,
            color: '#8c8c8c',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 0.2s',
          }}
        />
      </div>

      {expanded && (
        <>
          {/* Section 1: Goal Restatement */}
          <div
            style={{
              marginBottom: 12,
              padding: '10px 12px',
              borderRadius: 8,
              background: '#f0f7ff',
              border: '1px solid #e6f0ff',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <BulbOutlined style={{ color: '#0f6fff', fontSize: 13 }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: '#10233f' }}>
                我理解你的目标是
              </span>
            </div>
            <div style={{ fontSize: 13, color: '#262626', lineHeight: 1.6 }}>
              {proposal.realGoal}
            </div>
            {proposal.goalConfidence < 0.7 && (
              <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 4 }}>
                (如果理解有误，请告诉我)
              </div>
            )}
          </div>

          {/* Section 2: Recommended Services */}
          {proposal.recommendedServices.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 13 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#10233f' }}>
                  我可以帮你做 {proposal.recommendedServices.length} 件事
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {proposal.recommendedServices.slice(0, 3).map((service, index) => (
                  <div
                    key={service.serviceType}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '8px 12px',
                      borderRadius: 8,
                      background: service.rank === 1 ? '#f6ffed' : '#fafafa',
                      border: `1px solid ${service.rank === 1 ? '#b7eb8f' : '#f0f0f0'}`,
                      cursor: service.canStartNow ? 'pointer' : 'default',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => service.canStartNow && onExecute?.(service.serviceType)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                      <span
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: '50%',
                          background: service.rank === 1 ? '#52c41a' : '#d9d9d9',
                          color: '#fff',
                          fontSize: 11,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                        }}
                      >
                        {service.rank}
                      </span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#262626' }}>
                          {service.displayName}
                        </div>
                        {service.reason && (
                          <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                            {service.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    {service.canStartNow && service.rank === 1 && (
                      <span
                        style={{
                          fontSize: 12,
                          color: '#0f6fff',
                          fontWeight: 500,
                        }}
                      >
                        执行 →
                      </span>
                    )}
                    {!service.canStartNow && (
                      <span
                        style={{
                          fontSize: 11,
                          color: '#faad14',
                        }}
                      >
                        需补充信息
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section 3: Missing Inputs */}
          {proposal.missingInputs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <QuestionCircleOutlined style={{ color: '#faad14', fontSize: 13 }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: '#10233f' }}>
                  还需要确认 {proposal.missingInputs.length} 项信息
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {proposal.missingInputs.slice(0, 3).map((input) => (
                  <div
                    key={input.field}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '6px 10px',
                      borderRadius: 6,
                      background: '#fffbe6',
                      border: '1px solid #ffe58f',
                      cursor: 'pointer',
                    }}
                    onClick={() => onProvideInput?.(input.field)}
                  >
                    <div>
                      <span style={{ fontSize: 12, color: '#262626', fontWeight: 500 }}>
                        {input.label}
                      </span>
                      {input.description && (
                        <span style={{ fontSize: 11, color: '#8c8c8c', marginLeft: 6 }}>
                          ({input.description})
                        </span>
                      )}
                      {input.required && (
                        <span style={{ fontSize: 10, color: '#ff4d4f', marginLeft: 4 }}>*</span>
                      )}
                    </div>
                    <span style={{ fontSize: 11, color: '#0f6fff' }}>补充 →</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: '1px solid #d9d9d9',
                  background: '#fff',
                  color: '#595959',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                取消
              </button>
            )}
            {canExecute && onConfirm && (
              <button
                type="button"
                onClick={onConfirm}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: 'linear-gradient(135deg, #0f6fff 0%, #1890ff 100%)',
                  color: '#fff',
                  fontSize: 12,
                  fontWeight: 500,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(15, 111, 255, 0.3)',
                }}
              >
                开始执行
              </button>
            )}
            {!canExecute && primaryService && (
              <div style={{ fontSize: 11, color: '#8c8c8c', padding: '6px 0' }}>
                补充信息后即可开始
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Export ────────────────────────────────────────────

export default ServiceProposalCard;
