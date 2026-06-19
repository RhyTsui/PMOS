import type { ComponentType } from 'react';
import {
  Accordion,
  Alert,
  AlertDialog,
  AspectRatio,
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  Breadcrumb,
  Calendar,
  Card,
  Carousel,
  Chart,
  Checkbox,
  Collapsible,
  Command,
  ContextMenu,
  Dialog,
  Drawer,
  DropdownMenu,
  Empty,
  Field,
  Form,
  GlassPanel,
  HoverCard,
  IconAsset,
  Input,
  InputGroup,
  InputOTP,
  Item,
  Kbd,
  Label,
  Menubar,
  MetricCard,
  NavigationMenu,
  Pagination,
  Popover,
  Progress,
  RadioGroup,
  Resizable,
  ScrollArea,
  Select,
  Separator,
  Sheet,
  Sidebar,
  Skeleton,
  Slider,
  Spinner,
  StatusBadge,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toggle,
  ToggleGroup,
  Tooltip,
  CodeBlock,
  FancyCodeBlock,
  Toaster,
} from './index';

export type CommonUiComponentName =
  | 'Accordion'
  | 'Alert'
  | 'AlertDialog'
  | 'AspectRatio'
  | 'Avatar'
  | 'Badge'
  | 'Button'
  | 'ButtonGroup'
  | 'Breadcrumb'
  | 'Calendar'
  | 'Card'
  | 'Carousel'
  | 'Chart'
  | 'Checkbox'
  | 'Collapsible'
  | 'Command'
  | 'ContextMenu'
  | 'Dialog'
  | 'Drawer'
  | 'DropdownMenu'
  | 'Empty'
  | 'Field'
  | 'Form'
  | 'GlassPanel'
  | 'HoverCard'
  | 'IconAsset'
  | 'Input'
  | 'InputGroup'
  | 'InputOTP'
  | 'Item'
  | 'Kbd'
  | 'Label'
  | 'Menubar'
  | 'MetricCard'
  | 'NavigationMenu'
  | 'Pagination'
  | 'Popover'
  | 'Progress'
  | 'RadioGroup'
  | 'Resizable'
  | 'ScrollArea'
  | 'Select'
  | 'Separator'
  | 'Sheet'
  | 'Sidebar'
  | 'Skeleton'
  | 'Slider'
  | 'Spinner'
  | 'StatusBadge'
  | 'Switch'
  | 'Table'
  | 'Tabs'
  | 'Textarea'
  | 'Toggle'
  | 'ToggleGroup'
  | 'Tooltip'
  | 'CodeBlock'
  | 'FancyCodeBlock'
  | 'Toaster';

export const COMMON_UI_COMPONENT_REGISTRY: Record<CommonUiComponentName, ComponentType<any>> = {
  Accordion,
  Alert,
  AlertDialog,
  AspectRatio,
  Avatar,
  Badge,
  Button,
  ButtonGroup,
  Breadcrumb,
  Calendar,
  Card,
  Carousel,
  Chart,
  Checkbox,
  Collapsible,
  Command,
  ContextMenu,
  Dialog,
  Drawer,
  DropdownMenu,
  Empty,
  Field,
  Form,
  GlassPanel,
  HoverCard,
  IconAsset,
  Input,
  InputGroup,
  InputOTP,
  Item,
  Kbd,
  Label,
  Menubar,
  MetricCard,
  NavigationMenu,
  Pagination,
  Popover,
  Progress,
  RadioGroup,
  Resizable,
  ScrollArea,
  Select,
  Separator,
  Sheet,
  Sidebar,
  Skeleton,
  Slider,
  Spinner,
  StatusBadge,
  Switch,
  Table,
  Tabs,
  Textarea,
  Toggle,
  ToggleGroup,
  Tooltip,
  CodeBlock,
  FancyCodeBlock,
  Toaster,
};

export function resolveCommonUiComponent(name: CommonUiComponentName): ComponentType<any> {
  return COMMON_UI_COMPONENT_REGISTRY[name];
}

export const COMMON_UI_COMPONENT_GROUPS = {
  display: [
    'Card',
    'MetricCard',
    'StatusBadge',
    'GlassPanel',
    'Avatar',
    'Badge',
    'Chart',
    'CodeBlock',
    'FancyCodeBlock',
  ],
  inputs: [
    'Button',
    'ButtonGroup',
    'Checkbox',
    'Command',
    'Dialog',
    'Drawer',
    'DropdownMenu',
    'Form',
    'Input',
    'InputGroup',
    'InputOTP',
    'Item',
    'Select',
    'Slider',
    'Switch',
    'Tabs',
    'Textarea',
    'Toggle',
    'ToggleGroup',
  ],
  navigation: [
    'Accordion',
    'AlertDialog',
    'Breadcrumb',
    'Calendar',
    'Collapsible',
    'ContextMenu',
    'HoverCard',
    'Menubar',
    'NavigationMenu',
    'Pagination',
    'Popover',
    'RadioGroup',
    'Resizable',
    'Carousel',
    'ScrollArea',
    'Separator',
    'Sheet',
    'Sidebar',
    'Tooltip',
  ],
  feedback: [
    'Alert',
    'Empty',
    'Progress',
    'Skeleton',
    'Spinner',
    'Toaster',
  ],
} as const;
