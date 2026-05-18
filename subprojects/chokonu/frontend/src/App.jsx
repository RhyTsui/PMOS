import { Suspense, lazy, useEffect, useState } from "react";

const LoginPage = lazy(() => import("./pages/LoginPage"));
const WorkbenchApp = lazy(() => import("./pages/WorkbenchApp"));

const workbenchPages = new Set([
  "overview",
  "projects",
  "requirements",
  "cases",
  "execution",
  "trace",
  "reports",
  "review",
  "gate",
]);

function parseRoute() {
  const hash = window.location.hash.replace(/^#/, "");
  const [root = "/login", page] = hash.split("/").filter(Boolean);

  if (root === "workbench") {
    return {
      screen: "workbench",
      page: workbenchPages.has(page) ? page : "overview",
    };
  }

  return {
    screen: "login",
    page: "login",
  };
}

export default function App() {
  const [route, setRoute] = useState(parseRoute);

  useEffect(() => {
    const onHashChange = () => setRoute(parseRoute());
    window.addEventListener("hashchange", onHashChange);
    if (!window.location.hash) {
      window.location.hash = "#/login";
    }
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const enterWorkbench = (page = "overview") => {
    window.location.hash = `#/workbench/${page}`;
  };

  const exitWorkbench = () => {
    window.location.hash = "#/login";
  };

  const navigateWorkbench = (page) => {
    window.location.hash = `#/workbench/${page}`;
  };

  if (route.screen === "workbench") {
    return (
      <Suspense fallback={<div className="app-loading">正在加载工作台...</div>}>
        <WorkbenchApp activePageFromRoute={route.page} onNavigatePage={navigateWorkbench} onLogout={exitWorkbench} />
      </Suspense>
    );
  }

  return (
    <Suspense fallback={<div className="app-loading">正在加载登录页...</div>}>
      <LoginPage onEnterWorkbench={() => enterWorkbench("overview")} />
    </Suspense>
  );
}
