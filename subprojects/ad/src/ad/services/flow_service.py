from ad.schemas import FlowResponse, NodeUser, NodeUsersResponse, TraceStep, UserTraceResponse
from ad.services.mock_data import MOCK_FLOW_LINKS, MOCK_FLOW_NODES, MOCK_USERS, MOCK_USER_TRACES


def get_flow() -> FlowResponse:
    return FlowResponse(nodes=MOCK_FLOW_NODES, links=MOCK_FLOW_LINKS)


def get_users_for_node(node_id: str) -> NodeUsersResponse:
    users = [NodeUser(**user) for user in MOCK_USERS if node_id in user["visited_nodes"]]
    return NodeUsersResponse(node_id=node_id, users=users)


def get_trace_for_user(user_id: str) -> UserTraceResponse:
    trace = [TraceStep(**step) for step in MOCK_USER_TRACES.get(user_id, [])]
    return UserTraceResponse(user_id=user_id, trace=trace)
