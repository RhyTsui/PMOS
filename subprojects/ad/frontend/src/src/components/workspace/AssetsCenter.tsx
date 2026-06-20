'use client';

import { CheckCircle2, Download, Ellipsis, MapPin, Search, Trash2, Upload } from 'lucide-react';
import { App, Dropdown, type MenuProps } from 'antd';
import type { AssetRecord, AssetSourceFilter, AssetFormatFilter, WorkspaceView } from '@/lib/page-helpers';
import { ASSET_SOURCE_FILTERS, ASSET_FORMAT_FILTERS, FilterSelect, getAssetPreview, getAssetFileName, getAssetTypeLabel } from '@/lib/page-helpers';

type ThemeColors = {
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
};

type AssetsCenterProps = {
  isMobile: boolean;
  pageSidePadding: number;
  themeColors: ThemeColors;
  assetSearch: string;
  setAssetSearch: (value: string) => void;
  selectedAssets: AssetRecord[];
  applySelectedAssets: () => void;
  handleDownloadAssets: (assets: AssetRecord[]) => void;
  handleDeleteAssets: (ids: string[]) => void;
  assetSourceFilter: AssetSourceFilter;
  setAssetSourceFilter: (value: AssetSourceFilter) => void;
  assetFormatFilter: AssetFormatFilter;
  setAssetFormatFilter: (value: AssetFormatFilter) => void;
  assetUploadInputRef: React.RefObject<HTMLInputElement | null>;
  switchWorkspaceView: (view: WorkspaceView) => void;
  handleUploadFiles: (files: FileList | File[], sourceType?: 'click' | 'drag' | 'paste') => void;
  filteredAssets: AssetRecord[];
  selectedAssetIds: string[];
  setSelectedAssetIds: (ids: string[] | ((prev: string[]) => string[])) => void;
  hoveredAssetId: string | null;
  setHoveredAssetId: (id: string | null) => void;
  handleLocateAsset: (asset: AssetRecord) => void;
  handleConfirmDeleteAsset: (asset: AssetRecord) => void;
  setOpenedAsset: (asset: AssetRecord | null) => void;
};

export function AssetsCenter(props: AssetsCenterProps) {
  const { message } = App.useApp();
  const {
    isMobile,
    pageSidePadding,
    themeColors: c,
    assetSearch,
    setAssetSearch,
    selectedAssets,
    applySelectedAssets,
    handleDownloadAssets,
    handleDeleteAssets,
    assetSourceFilter,
    setAssetSourceFilter,
    assetFormatFilter,
    setAssetFormatFilter,
    assetUploadInputRef,
    switchWorkspaceView,
    handleUploadFiles,
    filteredAssets,
    selectedAssetIds,
    setSelectedAssetIds,
    hoveredAssetId,
    setHoveredAssetId,
    handleLocateAsset,
    handleConfirmDeleteAsset,
    setOpenedAsset,
  } = props;

  return (
    <div style={{ width: '100%', maxWidth: 1120, margin: '0 auto', padding: `0 ${pageSidePadding}px ${isMobile ? 12 : 18}px`, minHeight: 0 }}>
      <section style={{ display: 'flex', minHeight: 0, height: '100%', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingBottom: 12 }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, height: 38, width: isMobile ? '100%' : 320, borderRadius: 12, background: '#fff', padding: '0 12px', color: c.textMuted }}>
            <Search size={15} />
            <input
              id="asset-search-input"
              name="asset_search"
              value={assetSearch}
              onChange={(event) => setAssetSearch(event.target.value)}
              placeholder="搜索资料与结果"
              style={{ width: '100%', minWidth: 0, border: 'none', outline: 'none', background: 'transparent', color: c.textPrimary, fontSize: 13 }}
            />
          </label>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {selectedAssets.length > 0 && (
              <>
                <span style={{ fontSize: 13, color: selectedAssets.length > 10 ? '#b45309' : c.textMuted }}>已选 {selectedAssets.length}/10</span>
                <button type="button" onClick={applySelectedAssets} style={{ height: 34, borderRadius: 12, border: 'none', background: '#111827', color: '#fff', padding: '0 13px', fontSize: 13, cursor: 'pointer' }}>引用并开启对话</button>
                <button type="button" onClick={() => handleDownloadAssets(selectedAssets)} style={{ height: 34, borderRadius: 12, border: 'none', background: '#f3f4f6', color: c.textSecondary, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>下载</button>
                <button type="button" onClick={() => handleDeleteAssets(selectedAssets.map((asset) => asset.id))} style={{ height: 34, borderRadius: 12, border: 'none', background: '#f3f4f6', color: c.textSecondary, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>删除</button>
              </>
            )}
            <FilterSelect
              value={assetSourceFilter}
              options={ASSET_SOURCE_FILTERS}
              onChange={setAssetSourceFilter}
              ariaLabel="资料来源筛选"
              width={118}
            />
            <FilterSelect
              value={assetFormatFilter}
              options={ASSET_FORMAT_FILTERS}
              onChange={setAssetFormatFilter}
              ariaLabel="资料类型筛选"
              width={112}
            />
            <button type="button" onClick={() => assetUploadInputRef.current?.click()} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 34, borderRadius: 12, border: 'none', background: '#f3f4f6', color: c.textSecondary, padding: '0 12px', fontSize: 13, cursor: 'pointer' }}>
              <Upload size={14} />
              上传
            </button>
            <input
              id="asset-upload-input"
              name="asset_upload"
              ref={assetUploadInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              accept=".csv,.xlsx,.xls,.txt,.log,.json,.pdf,.doc,.docx,image/*,video/*"
              onChange={(event) => {
                if (!event.target.files?.length) return;
                switchWorkspaceView('chat');
                handleUploadFiles(event.target.files, 'click');
                event.target.value = '';
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', paddingRight: 2 }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '30px 46px minmax(0,1fr) 72px 70px 34px' : '34px 48px minmax(220px,1fr) 92px 116px 112px 44px', alignItems: 'center', height: 34, padding: '0 8px', fontSize: 12, color: c.textMuted }}>
            <span />
            <span />
            <span>名称</span>
            <span>类型</span>
            {!isMobile && <span>来源</span>}
            <span>日期</span>
            <span />
          </div>

          {filteredAssets.map((asset) => {
            const checked = selectedAssetIds.includes(asset.id);
            const hovering = hoveredAssetId === asset.id;
            const menuItems: MenuProps['items'] = [
              { key: 'download', label: '下载', icon: <Download size={14} />, onClick: () => handleDownloadAssets([asset]) },
              { key: 'locate', label: '定位到会话', icon: <MapPin size={14} />, onClick: () => handleLocateAsset(asset) },
              { key: 'delete', label: '删除', icon: <Trash2 size={14} />, onClick: () => handleConfirmDeleteAsset(asset) },
            ];

            return (
              <div
                key={asset.id}
                onMouseEnter={() => setHoveredAssetId(asset.id)}
                onMouseLeave={() => setHoveredAssetId(null)}
                data-asset-anchor={asset.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: isMobile ? '30px 46px minmax(0,1fr) 72px 70px 34px' : '34px 48px minmax(220px,1fr) 92px 116px 112px 44px',
                  alignItems: 'center',
                  minHeight: 52,
                  padding: '4px 8px',
                  borderRadius: 12,
                  background: checked ? '#eef4ff' : hovering ? '#f3f4f6' : 'transparent',
                  transition: 'background 160ms ease',
                }}
              >
                <button
                  type="button"
                  aria-label="选择资料"
                  onClick={() => {
                    setSelectedAssetIds((prev) => {
                      if (prev.includes(asset.id)) return prev.filter((id) => id !== asset.id);
                      if (prev.length >= 10) {
                        message.warning('最多选择 10 个文件');
                        return prev;
                      }
                      return [...prev, asset.id];
                    });
                  }}
                  style={{ width: 24, height: 24, borderRadius: 8, border: checked ? `1px solid ${c.accent}` : `1px solid ${hovering ? '#d1d5db' : 'transparent'}`, background: checked ? c.accent : '#fff', color: '#fff', opacity: checked || hovering ? 1 : 0, cursor: 'pointer' }}
                >
                  {checked && <CheckCircle2 size={14} />}
                </button>

                <button type="button" onClick={() => setOpenedAsset(asset)} style={{ width: 38, height: 38, overflow: 'hidden', borderRadius: 10, border: 'none', padding: 0, cursor: 'pointer' }}>
                  {getAssetPreview(asset)}
                </button>

                <button type="button" onClick={() => setOpenedAsset(asset)} style={{ minWidth: 0, border: 'none', background: 'transparent', padding: '0 8px', textAlign: 'left', cursor: 'pointer' }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 13, fontWeight: 400, color: c.textPrimary }}>{getAssetFileName(asset)}</div>
                </button>

                <div style={{ fontSize: 12, color: c.textSecondary }}>{getAssetTypeLabel(asset)}</div>
                {!isMobile && <div style={{ fontSize: 12, color: c.textMuted }}>{asset.source}</div>}
                <div style={{ fontSize: 12, color: c.textMuted }}>{asset.updatedAt}</div>
                <Dropdown menu={{ items: menuItems }} trigger={['click']} placement="bottomRight">
                  <button
                    type="button"
                    onClick={(event) => event.stopPropagation()}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 10,
                      border: 'none',
                      background: hovering ? '#fff' : 'transparent',
                      color: c.textMuted,
                      opacity: hovering ? 1 : 0,
                      cursor: 'pointer',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      justifySelf: 'center',
                      alignSelf: 'center',
                      padding: 0,
                      lineHeight: 1,
                    }}
                    title="更多"
                    data-asset-more={asset.id}
                  >
                    <Ellipsis size={16} />
                  </button>
                </Dropdown>
              </div>
            );
          })}

          {filteredAssets.length === 0 && (
            <div style={{ padding: '34px 0', textAlign: 'center', color: c.textMuted, fontSize: 13 }}>
              没有找到匹配的资料。
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
