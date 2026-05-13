'use client';

import { Modal } from 'antd';

interface ImagePreviewModalProps {
  open: boolean;
  imageUrl?: string;
  title?: string;
  onClose: () => void;
}

export function ImagePreviewModal({ open, imageUrl, title, onClose }: ImagePreviewModalProps) {
  return (
    <Modal
      open={open}
      title={title || '图片预览'}
      onCancel={onClose}
      footer={null}
      width={720}
      centered
      styles={{
        header: {
          background: '#0d1117',
          borderBottom: '1px solid rgba(48,54,61,0.6)',
          color: '#c8d6e5',
        },
        body: {
          padding: 16,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: 300,
          background: '#0d1117',
        },
        mask: {
          background: 'rgba(0,0,0,0.7)',
        },
      }}
    >
      {imageUrl && (
        <img
          src={imageUrl}
          alt={title || 'Preview'}
          style={{
            maxWidth: '100%',
            maxHeight: '70vh',
            objectFit: 'contain',
            borderRadius: 8,
          }}
        />
      )}
    </Modal>
  );
}
