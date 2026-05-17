'use client';

import { YkPorjectSelect } from '@yoka-ui/ui';
import type { CSSProperties, ReactNode } from 'react';
import { useMemo } from 'react';

export interface YkProjectOption {
  label: string;
  value: string | number;
  icon: string;
  followed?: boolean;
  follow_index?: number;
  recent_visit?: boolean;
  closed?: boolean;
}

interface YkProjectSelectProps {
  value: string | number;
  options: YkProjectOption[];
  onChange: (value: string | number) => void;
  followedCallback?: (item: YkProjectOption, followed: boolean) => void;
  slot?: ReactNode;
  customShow?: ReactNode;
  maxVisibleItems?: number;
}

export default function YkProjectSelect({
  value,
  options,
  onChange,
  followedCallback,
  slot,
  customShow,
  maxVisibleItems,
}: YkProjectSelectProps) {
  const normalizedOptions = useMemo(
    () => options.map((item) => ({ ...item, closed: item.closed ?? false })),
    [options],
  );

  const shellStyle = {
    '--project-select-visible-items': maxVisibleItems || 9,
  } as CSSProperties;

  return (
    <span className="yoka-project-selector-shell" style={shellStyle}>
    <YkPorjectSelect
      value={value}
      options={normalizedOptions}
      onChange={onChange}
      followedCallback={followedCallback}
      slot={slot}
      customShow={customShow}
    />
    </span>
  );
}
