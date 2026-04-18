import axios from "axios";

const api = axios.create({
  baseURL: "/api/v1",
});

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
