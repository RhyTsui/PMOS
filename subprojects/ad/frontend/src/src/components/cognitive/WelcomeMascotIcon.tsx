'use client';

import React from 'react';

interface WelcomeMascotIconProps {
  size?: number;
  stageWidth?: number;
  stageHeight?: number;
}

const MASCOT_SRC = '/xiaoqiao-mascot/base-mascot-animation.png';

export function WelcomeMascotIcon({ size = 104, stageWidth = size, stageHeight = size }: WelcomeMascotIconProps) {
  return (
    <span
      style={{
        position: 'relative',
        display: 'block',
        width: stageWidth,
        height: stageHeight,
        maxWidth: '100%',
        overflow: 'visible',
      }}
    >
      <img
        src={MASCOT_SRC}
        alt="小乔智投"
        draggable={false}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          display: 'block',
          width: size,
          height: size,
          minWidth: size,
          minHeight: size,
          objectFit: 'contain',
          transform: 'translate(-50%, -50%)',
          userSelect: 'none',
        }}
      />
    </span>
  );
}
