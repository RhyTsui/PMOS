from fastapi import APIRouter

from ad.schemas import NodeUsersResponse, UserTraceResponse
from ad.services.flow_service import get_trace_for_user, get_users_for_node

router = APIRouter()


@router.get("/nodes/{node_id}/users", response_model=NodeUsersResponse)
def read_node_users(node_id: str) -> NodeUsersResponse:
    return get_users_for_node(node_id)


@router.get("/users/{user_id}/trace", response_model=UserTraceResponse)
def read_user_trace(user_id: str) -> UserTraceResponse:
    return get_trace_for_user(user_id)
