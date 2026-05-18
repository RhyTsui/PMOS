import { useState } from "react";

import { Button, Drawer, Form, Input, Select, Space, Steps, Tabs, Tag } from "antd";

import { projectRows } from "../../data/mockData";
import { DetailPanel, statusColor, WorkbenchPage } from "./shared";

export function ProjectDetail({ record, workflowActions }) {
  const items = [
    { key: "overview", label: "接入概览", children: <p>{record.tabs.overview}</p> },
    {
      key: "repo",
      label: "仓库接入",
      children: (
        <div className="detail-stack">
          <p>{record.tabs.repo}</p>
          <div className="detail-grid">
            <div>
              <span>仓库</span>
              <strong>{record.repo}</strong>
            </div>
            <div>
              <span>分支</span>
              <strong>{record.branch}</strong>
            </div>
            <div>
              <span>安装命令</span>
              <strong>{record.install}</strong>
            </div>
            <div>
              <span>启动命令</span>
              <strong>{record.start}</strong>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "mapping",
      label: "能力映射",
      children: (
        <ul className="plain-list">
          {record.tabs.mapping.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ),
    },
    { key: "coding", label: "AI Coding 衔接", children: <p>{record.tabs.aiCoding}</p> },
    {
      key: "check",
      label: "接入校验",
      children: (
        <ul className="plain-list">
          {record.tabs.checks.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <div className="detail-panel-body">
      <div className="detail-title">
        <div>
          <span className="eyebrow">项目详情</span>
          <h3>{record.name}</h3>
        </div>
        <Tag color={statusColor(record.status)}>{record.status}</Tag>
      </div>
      <div className="detail-grid compact">
        <div>
          <span>环境</span>
          <strong>{record.env}</strong>
        </div>
        <div>
          <span>接入状态</span>
          <strong>{record.access}</strong>
        </div>
        <div>
          <span>能力域</span>
          <strong>{record.capabilities}</strong>
        </div>
        <div>
          <span>AI Coding</span>
          <strong>{record.aiCoding}</strong>
        </div>
      </div>
      <p className="detail-summary">{record.validation}</p>
      <Tabs items={items} size="small" />
      <div className="detail-actions">
        <Button type="primary" onClick={() => workflowActions?.fromProjectToRequirements(record.key)}>
          进入需求台
        </Button>
      </div>
    </div>
  );
}

export default function ProjectsPage({
  currentProject,
  currentEnv,
  currentVersion,
  isMobile,
  detailCollapsed,
  onToggleDetail,
  selectedRecord,
  onSelectRecord,
  onSwitchProject,
  workflowActions,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [form] = Form.useForm();

  const handlePrefill = () => {
    form.setFieldsValue({
      projectName: selectedRecord.name,
      repo: selectedRecord.repo,
      branch: selectedRecord.branch,
      env: selectedRecord.env,
      install: selectedRecord.install,
      start: selectedRecord.start,
      abilities: selectedRecord.capabilities.split(" / "),
    });
    setDrawerOpen(true);
  };

  return (
    <>
      <WorkbenchPage
        title="项目台"
        desc="项目是平台能力的承接对象，因此要先完成项目接入，后面才谈统一质量主链。"
        summary={[
          { label: "已接入项目", value: "9" },
          { label: "接入中", value: "3" },
          { label: "AI Coding 已联通", value: "6" },
          { label: "待补环境校验", value: "2" },
        ]}
        filters={[
          { label: "当前项目", value: currentProject.name },
          { label: "环境", value: currentEnv },
          { label: "版本", value: currentVersion },
          { label: "AI Coding", value: "已接入 / 部分接入" },
        ]}
        rows={projectRows}
        selectedRecord={selectedRecord}
        onSelect={(record) => {
          onSwitchProject?.(record.key);
          onSelectRecord(record);
        }}
        columns={[
          { title: "项目", dataIndex: "name" },
          { title: "仓库", dataIndex: "repo" },
          { title: "分支", dataIndex: "branch" },
          { title: "环境", dataIndex: "env" },
          {
            title: "接入状态",
            dataIndex: "access",
            render: (value) => <Tag color={statusColor(value)}>{value}</Tag>,
          },
          { title: "能力域", dataIndex: "capabilities" },
          { title: "AI Coding", dataIndex: "aiCoding" },
        ]}
        detailContent={
          isMobile ? null : (
            <DetailPanel title={selectedRecord.name} collapsed={detailCollapsed} onToggle={onToggleDetail}>
              <ProjectDetail record={selectedRecord} workflowActions={workflowActions} />
            </DetailPanel>
          )
        }
        actions={
          <Space>
            <Button type="primary" onClick={handlePrefill}>
              发起项目接入
            </Button>
            <Button onClick={() => workflowActions?.fromProjectToRequirements(selectedRecord.key)}>进入需求台</Button>
          </Space>
        }
      />

      <Drawer
        title="项目接入"
        width={560}
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        extra={<Button type="primary" onClick={() => setDrawerOpen(false)}>保存接入草案</Button>}
      >
        <Steps
          size="small"
          current={1}
          items={[
            { title: "仓库信息" },
            { title: "环境命令" },
            { title: "能力映射" },
            { title: "接入校验" },
          ]}
        />
        <Form form={form} layout="vertical" style={{ marginTop: 24 }}>
          <Form.Item label="项目名称" name="projectName">
            <Input placeholder="输入项目名称" />
          </Form.Item>
          <Form.Item label="仓库地址" name="repo">
            <Input placeholder="gitlab / github 仓库地址" />
          </Form.Item>
          <Form.Item label="分支" name="branch">
            <Input placeholder="main / release / feature" />
          </Form.Item>
          <Form.Item label="环境" name="env">
            <Select options={["测试", "预发", "生产镜像"].map((item) => ({ label: item, value: item }))} />
          </Form.Item>
          <Form.Item label="安装命令" name="install">
            <Input placeholder="npm install / pnpm install" />
          </Form.Item>
          <Form.Item label="启动命令" name="start">
            <Input placeholder="npm run dev / pnpm start" />
          </Form.Item>
          <Form.Item label="能力映射" name="abilities">
            <Select
              mode="multiple"
              options={["UI 自动化", "Agent 评测", "MCP 评测", "AI Eval", "Trace 回传"].map((item) => ({
                label: item,
                value: item,
              }))}
            />
          </Form.Item>
        </Form>
      </Drawer>
    </>
  );
}
