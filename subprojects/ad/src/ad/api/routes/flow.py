from fastapi import APIRouter

from ad.schemas import FlowResponse
from ad.services.flow_service import get_flow

router = APIRouter()


@router.get("/flow", response_model=FlowResponse)
def read_flow() -> FlowResponse:
    return get_flow()
