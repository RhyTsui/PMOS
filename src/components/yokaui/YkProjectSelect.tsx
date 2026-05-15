'use client';

import { YkPorjectSelect } from '@yoka-ui/ui';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';

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
}: YkProjectSelectProps) {
  const [instanceKey, setInstanceKey] = useState(0);

  const normalizedOptions = useMemo(
    () => options.map((item) => ({ ...item, closed: false })),
    [options],
  );

  return (
    <YkPorjectSelect
      key={instanceKey}
      value={value}
      options={normalizedOptions}
      onChange={(nextValue) => {
        onChange(nextValue);
        setInstanceKey((prev) => prev + 1);
      }}
      followedCallback={followedCallback}
      slot={slot}
      customShow={customShow}
    />
  );
}
