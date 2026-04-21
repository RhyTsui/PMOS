from fastapi import APIRouter

from ad.schemas import IntegrationPocResponse
from ad.services.integration_service import get_integration_poc

router = APIRouter()


@router.get("/integration-poc", response_model=IntegrationPocResponse)
def read_integration_poc() -> IntegrationPocResponse:
    return get_integration_poc()
