'use client';

import type { AdminTab } from './admin-tab-helpers';
import { ADMIN_CENTERS, getCenterMenuItems } from './admin-menu';
import { RuntimeImpactBadge } from './admin-menu';
import { AdminCrudHeader, AdminCrudShell } from './AdminCrudScaffold';

function AdminOverviewTab({ onJump, visibleTabs }: { onJump: (tab: AdminTab) => void; visibleTabs: AdminTab[] }) {
  const centers = ADMIN_CENTERS
    .map((center) => ({ center, items: getCenterMenuItems(center.key, visibleTabs) }))
    .filter(({ center, items }) => visibleTabs.includes(center.defaultTab) || items.length > 0);

  return (
    <AdminCrudShell>
      <AdminCrudHeader
        title="智能体配置中枢"
        description="按治理领域进入请求理解、提示词、能力接入、工作流、展示和权限配置。"
      />
        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {centers.map(({ center, items }) => (
            <article
              key={center.key}
              className="rounded-[18px] border border-[#dbe4f0] bg-white p-4 text-left"
            >
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-[#eef5ff] text-[#0f6fff]">
                  <center.icon className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-[#10233f]">{center.label}</div>
                  <div className="mt-1 text-[11px] leading-5 text-[#6b7c93]">{center.description}</div>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {items.map((item) => (
                  <button
                    key={`${center.key}-${item.tab}`}
                    type="button"
                    onClick={() => onJump(item.tab)}
                    className="rounded-full border border-[#dbe4f0] bg-[#f8fbff] px-3 py-1 text-[11px] text-[#36506f] transition-colors hover:border-[#b8cae6] hover:bg-white"
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {Array.from(new Set(items.flatMap((item) => item.impacts))).map((impact) => (
                  <RuntimeImpactBadge key={impact} impact={impact} />
                ))}
              </div>
            </article>
          ))}
        </section>
    </AdminCrudShell>
  );
}

export { AdminOverviewTab };
