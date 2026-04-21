import { useState } from "react";

import FullDesignPage from "./pages/FullDesignPage";
import FlowPage from "./pages/FlowPage";

export default function App() {
  const [mode, setMode] = useState("full-design");

  return (
    <div>
      <header className="app-switcher">
        <div className="app-switcher-inner">
          <div>
            <p className="eyebrow">ad workspace</p>
            <h1>广告工作台演示区</h1>
          </div>
          <div className="switcher-tabs">
            <button
              type="button"
              className={`switcher-tab ${mode === "full-design" ? "switcher-tab-active" : ""}`}
              onClick={() => setMode("full-design")}
            >
              全功能设计
            </button>
            <button
              type="button"
              className={`switcher-tab ${mode === "integration-poc" ? "switcher-tab-active" : ""}`}
              onClick={() => setMode("integration-poc")}
            >
              联调 POC
            </button>
          </div>
        </div>
      </header>
      {mode === "full-design" ? <FullDesignPage /> : <FlowPage />}
    </div>
  );
}
