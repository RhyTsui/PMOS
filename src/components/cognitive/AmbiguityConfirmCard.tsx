'use client';

import React from 'react';
import { InfoCircleOutlined } from '@ant-design/icons';

export interface AmbiguityConfirmOption {
  label: string;
  prompt: string;
}

export interface AmbiguityConfirmPayload {
  title: string;
  hint: string;
  options: AmbiguityConfirmOption[];
}

interface AmbiguityConfirmCardProps {
  payload: AmbiguityConfirmPayload;
  onChoose?: (prompt: string) => void;
  onSubmitChoose?: (prompt: string) => void;
}

export function AmbiguityConfirmCard({ payload, onChoose, onSubmitChoose }: AmbiguityConfirmCardProps) {
  const handleChoose = (prompt: string) => {
    if (onSubmitChoose) {
      onSubmitChoose(prompt);
      return;
    }
    onChoose?.(prompt);
  };

  return (
    <div
      style={{
        marginTop: 8,
        borderRadius: 14,
        border: '1px solid #d7e3f5',
        background: '#f7fbff',
        padding: '12px 14px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <InfoCircleOutlined style={{ color: '#0f6fff', fontSize: 15 }} />
        <div style={{ fontSize: 13, fontWeight: 650, color: '#10233f' }}>{payload.title}</div>
      </div>
      <div style={{ fontSize: 12, color: '#5f6f86', lineHeight: 1.6, marginBottom: 10 }}>
        {payload.hint}
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {payload.options.slice(0, 2).map((option) => (
          <button
            key={option.label}
            type="button"
            onClick={() => handleChoose(option.prompt)}
            style={{
              border: '1px solid #bcd3f6',
              background: '#fff',
              color: '#0f6fff',
              borderRadius: 999,
              padding: '7px 14px',
              fontSize: 12,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
