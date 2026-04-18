import { useEffect, useRef } from "react";
import * as echarts from "echarts";

export default function SankeyChart({ flow, onNodeClick }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!flow || !chartRef.current) {
      return undefined;
    }

    const chart = echarts.init(chartRef.current);
    const nodesById = Object.fromEntries(flow.nodes.map((node) => [node.id, node]));

    chart.setOption({
      tooltip: {
        trigger: "item",
        formatter: (params) => {
          if (params.dataType === "node") {
            const node = nodesById[params.name];
            return `${node?.label ?? params.name}<br/>用户数：${node?.user_count ?? 0}`;
          }

          if (params.dataType === "edge") {
            const sourceLabel = nodesById[params.data.source]?.label ?? params.data.source;
            const targetLabel = nodesById[params.data.target]?.label ?? params.data.target;
            return `${sourceLabel} → ${targetLabel}<br/>流转人数：${params.data.value}`;
          }

          return params.name;
        },
      },
      series: [
        {
          type: "sankey",
          data: flow.nodes.map((node) => ({
            name: node.id,
            value: node.user_count,
            itemStyle: {
              color:
                node.type === "exception"
                  ? "#f97316"
                  : node.type === "result"
                    ? "#2563eb"
                    : node.type === "storage"
                      ? "#0f766e"
                      : node.type === "window"
                        ? "#7c3aed"
                        : "#60a5fa",
            },
            label: {
              formatter: `${node.label}\n${node.user_count}人`,
              color: "#111827",
              fontSize: 12,
              lineHeight: 18,
            },
          })),
          links: flow.links,
          nodeAlign: "justify",
          nodeWidth: 20,
          nodeGap: 18,
          draggable: false,
          emphasis: { focus: "adjacency" },
          lineStyle: { color: "gradient", curveness: 0.5, opacity: 0.45 },
        },
      ],
    });

    const handleClick = (params) => {
      if (params.dataType === "node") {
        onNodeClick(params.name);
      }
    };

    chart.on("click", handleClick);

    const handleResize = () => chart.resize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      chart.off("click", handleClick);
      chart.dispose();
    };
  }, [flow, onNodeClick]);

  return <div className="chart" ref={chartRef} />;
}
