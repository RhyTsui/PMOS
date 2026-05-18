import { Button, Card } from "antd";

const capabilityItems = [
  { key: "test", color: "blue", title: "连弩 Test", desc: "承接 Web UI 自动化与回归证据链。" },
  { key: "code", color: "green", title: "连弩 Code", desc: "把 AI Coding 输入收进需求、用例与回归主链。" },
  { key: "eval", color: "purple", title: "连弩 Eval", desc: "覆盖 MCP / Agent 的 AI 应用评测与判定。" },
];

function PcLoginOrbit({ color = "blue", small = false }) {
  return (
    <div className={`pc-login-orbit ${color} ${small ? "small" : ""}`}>
      <span className="pc-login-orbit-core" />
    </div>
  );
}

export default function LoginPage({ onEnterWorkbench }) {
  return (
    <div className="pc-login-shell">
      <section className="pc-login-stage">
        <div className="pc-login-left">
          <div className="pc-login-brand">
            <PcLoginOrbit color="blue" />
            <div className="pc-login-brand-copy">
              <h1>连弩</h1>
              <p>连弩-AI自动化质量控制平台</p>
            </div>
          </div>

          <div className="pc-login-headline">
            一套 <span>质量门禁</span>，覆盖软件、代码与 AI 应用。
          </div>

          <div className="pc-login-capabilities">
            {capabilityItems.map((item) => (
              <div key={item.key} className="pc-login-capability">
                <PcLoginOrbit color={item.color} small />
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <Card className="brand-card pc-login-card" bordered={false}>
          <div className="pc-login-card-head">欢迎登录</div>

          <div className="pc-login-tabs">
            <button type="button" className="active">
              小闪扫码登录
            </button>
            <button type="button">小闪手机号登录</button>
          </div>

          <div className="pc-login-qr-panel">
            <div className="pc-login-qr-tip">请使用小闪扫码登录</div>
            <button type="button" className="pc-login-qr-box" onClick={onEnterWorkbench}>
              <div className="pc-login-qr-grid" />
              <div className="pc-login-qr-center">
                <PcLoginOrbit color="purple" small />
              </div>
            </button>
          </div>

          <div className="pc-login-links">
            <Button type="link">权限申请</Button>
            <span className="pc-login-divider" />
            <Button type="link">帮助中心</Button>
          </div>
        </Card>

        <div className="pc-login-glow glow-a" />
        <div className="pc-login-glow glow-b" />
      </section>
    </div>
  );
}
