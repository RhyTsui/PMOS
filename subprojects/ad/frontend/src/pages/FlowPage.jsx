import { useCallback, useEffect, useMemo, useState } from "react";

import { getFlow, getNodeUsers, getUserTrace } from "../api/client";
import NodeUserList from "../components/NodeUserList";
import SankeyChart from "../components/SankeyChart";
import UserTracePanel from "../components/UserTracePanel";

const SOURCE_TYPE_LABELS = {
  app: "APP",
  h5: "H5",
};

const USER_TYPE_LABELS = {
  new_user: "新用户",
  existing_user: "老用户",
};

export default function FlowPage() {
  const [flow, setFlow] = useState(null);
  const [flowLoading, setFlowLoading] = useState(true);
  const [flowError, setFlowError] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState("");
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [trace, setTrace] = useState([]);
  const [traceLoading, setTraceLoading] = useState(false);
  const [traceError, setTraceError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadFlow() {
      setFlowLoading(true);
      setFlowError("");

      try {
        const response = await getFlow();
        if (!mounted) {
          return;
        }
        setFlow(response);
      } catch (error) {
        if (!mounted) {
          return;
        }
        setFlow(null);
        setFlowError("Failed to load flow data. Make sure the backend is running.");
      } finally {
        if (mounted) {
          setFlowLoading(false);
        }
      }
    }

    loadFlow();

    return () => {
      mounted = false;
    };
  }, []);

  const nodeLabels = useMemo(() => {
    if (!flow) {
      return {};
    }

    return Object.fromEntries(flow.nodes.map((node) => [node.id, node.label]));
  }, [flow]);

  const selectedNodeLabel = selectedNodeId ? nodeLabels[selectedNodeId] ?? selectedNodeId : "";

  const formatNodeLabel = useCallback(
    (nodeId) => {
      if (!nodeId) {
        return "";
      }

      return nodeLabels[nodeId] ?? nodeId;
    },
    [nodeLabels],
  );

  const formatSourceType = useCallback((sourceType) => SOURCE_TYPE_LABELS[sourceType] ?? sourceType, []);
  const formatUserType = useCallback((userType) => USER_TYPE_LABELS[userType] ?? userType, []);

  const handleNodeClick = useCallback(async (nodeId) => {
    setSelectedNodeId(nodeId);
    setSelectedUserId("");
    setTrace([]);
    setTraceError("");
    setUsers([]);
    setUsersLoading(true);
    setUsersError("");

    try {
      const response = await getNodeUsers(nodeId);
      setUsers(response.users);
    } catch (error) {
      setUsersError(`Failed to load users for ${nodeId}.`);
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const handleUserClick = useCallback(async (userId) => {
    setSelectedUserId(userId);
    setTrace([]);
    setTraceLoading(true);
    setTraceError("");

    try {
      const response = await getUserTrace(userId);
      setTrace(response.trace);
    } catch (error) {
      setTraceError(`Failed to load trace for ${userId}.`);
    } finally {
      setTraceLoading(false);
    }
  }, []);

  return (
    <main className="page">
      <header className="hero">
        <div>
          <p className="eyebrow">ad prototype</p>
          <h1>Ads Flow Insight</h1>
          <p className="subtitle">Inspect a richer attribution flow, drill into users at each stage, and review end-to-end user trace details.</p>
        </div>
      </header>

      <section className="panel chart-panel">
        <h2>Attribution Sankey</h2>
        {flowLoading ? <p className="empty">Loading flow...</p> : null}
        {flowError ? <p className="error-message">{flowError}</p> : null}
        {!flowLoading && !flowError && flow ? <SankeyChart flow={flow} onNodeClick={handleNodeClick} /> : null}
      </section>

      <section className="details-grid">
        <NodeUserList
          nodeLabel={selectedNodeLabel}
          users={users}
          loading={usersLoading}
          error={usersError}
          onUserClick={handleUserClick}
          formatNodeLabel={formatNodeLabel}
          formatSourceType={formatSourceType}
          formatUserType={formatUserType}
        />
        <UserTracePanel
          userId={selectedUserId}
          trace={trace}
          loading={traceLoading}
          error={traceError}
          formatStepLabel={formatNodeLabel}
        />
      </section>
    </main>
  );
}
