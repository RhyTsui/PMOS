from pydantic import BaseModel


class FlowNode(BaseModel):
    id: str
    label: str
    type: str
    user_count: int


class FlowLink(BaseModel):
    source: str
    target: str
    value: int


class FlowResponse(BaseModel):
    nodes: list[FlowNode]
    links: list[FlowLink]


class NodeUser(BaseModel):
    user_id: str
    device_id: str
    source_type: str
    user_type: str
    current_node: str
    result_node: str
    visited_nodes: list[str]


class NodeUsersResponse(BaseModel):
    node_id: str
    users: list[NodeUser]


class TraceStep(BaseModel):
    step: str
    time: str


class UserTraceResponse(BaseModel):
    user_id: str
    trace: list[TraceStep]
