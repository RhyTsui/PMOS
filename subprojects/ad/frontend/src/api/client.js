import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
});

export const getIntegrationPoc = async () => {
  const response = await api.get("/integration-poc");
  return response.data;
};

export const getFullFunctionDesign = async () => {
  const response = await api.get("/full-function-design");
  return response.data;
};

export const getFullFunctionModules = async () => {
  const response = await api.get("/full-function-design/modules");
  return response.data;
};

export const getFullFunctionModule = async (moduleId) => {
  const response = await api.get(`/full-function-design/modules/${moduleId}`);
  return response.data;
};

export const getFullFunctionWalkthrough = async () => {
  const response = await api.get("/full-function-design/walkthrough");
  return response.data;
};

export const getFullFunctionMockCards = async () => {
  const response = await api.get("/full-function-design/mock-cards");
  return response.data;
};

export const getFullFunctionActivityFeed = async () => {
  const response = await api.get("/full-function-design/activity-feed");
  return response.data;
};

export const submitFullFunctionIntake = async (payload) => {
  const response = await api.post("/full-function-design/intake", payload);
  return response.data;
};

export const createFullFunctionCaseArchive = async (payload) => {
  const response = await api.post("/full-function-design/case-archive", payload);
  return response.data;
};

export const runFullFunctionStandardDocking = async (payload) => {
  const response = await api.post("/full-function-design/standard-docking/run", payload);
  return response.data;
};

export const getFullFunctionStandardDockingPlayback = async (taskId) => {
  const response = await api.get(`/full-function-design/standard-docking/${taskId}/playback`);
  return response.data;
};

export const runFullFunctionDiagnosis = async (payload) => {
  const response = await api.post("/full-function-design/diagnosis/run", payload);
  return response.data;
};

export const followUpFullFunctionDiagnosis = async (payload) => {
  const response = await api.post("/full-function-design/diagnosis/follow-up", payload);
  return response.data;
};

export const runFullFunctionAnalysis = async (payload) => {
  const response = await api.post("/full-function-design/analysis/run", payload);
  return response.data;
};

export const followUpFullFunctionAnalysis = async (payload) => {
  const response = await api.post("/full-function-design/analysis/follow-up", payload);
  return response.data;
};

export const getFlow = async () => {
  const response = await api.get("/flow");
  return response.data;
};

export const getNodeUsers = async (nodeId) => {
  const response = await api.get(`/nodes/${nodeId}/users`);
  return response.data;
};

export const getUserTrace = async (userId) => {
  const response = await api.get(`/users/${userId}/trace`);
  return response.data;
};
