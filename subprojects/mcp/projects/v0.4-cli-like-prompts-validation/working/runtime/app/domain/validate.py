from __future__ import annotations

from app.bi.mappings import is_report_operation
from app.catalog_loader import load_catalog
from app.domain.normalize import NormalizedRequest


class ValidationError(ValueError):
    pass



def validate_request(request: NormalizedRequest) -> NormalizedRequest:
    catalog = load_catalog()
    operation = catalog.operation_by_id(request.operation_id)
    allowed = set(operation.parameter_keys)

    unexpected = [key for key in request.canonical_params if key not in allowed]
    if unexpected:
        raise ValidationError(
            f"unexpected parameters for {request.operation_id}: {', '.join(unexpected)}"
        )

    for parameter in catalog.parameters_for_operation(request.operation_id):
        if parameter.required_for and request.operation_id in parameter.required_for:
            if parameter.key not in request.canonical_params:
                raise ValidationError(f"missing required parameter: {parameter.key}")

    if (
        "app_id" in request.canonical_params
        and "app_ref" in request.canonical_params
        and request.canonical_params["app_id"]
        and request.canonical_params["app_ref"]
    ):
        raise ValidationError("app_id and app_ref cannot both be provided")

    if is_report_operation(request.operation_id) and not (
        request.canonical_params.get("app_id") or request.canonical_params.get("app_ref")
    ):
        raise ValidationError("report operations require app_id or app_ref")

    if request.operation_id == "get_ad_hour_report":
        granularity = request.canonical_params.get("granularity")
        if granularity not in {"hour", "day"}:
            raise ValidationError("get_ad_hour_report only supports granularity hour or day")

    return request
