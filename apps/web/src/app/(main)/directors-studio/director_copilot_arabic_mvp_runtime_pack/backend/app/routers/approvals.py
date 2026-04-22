from __future__ import annotations

from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException
from sqlalchemy import select

from app.core.deps import DBSession
from app.models import ApprovalRequest, ApprovalStep
from app.schemas import ApprovalData, ApprovalDecisionRequest, ApprovalEnvelope, ApprovalRequestCreate, EnvelopeApprovals, MessageData, MessageEnvelope

router = APIRouter(tags=["approvals"])


@router.post("/approvals", response_model=ApprovalEnvelope, status_code=201)
def create_approval_request(payload: ApprovalRequestCreate, db: DBSession) -> ApprovalEnvelope:
    approval = ApprovalRequest(
        project_id=str(payload.project_id),
        object_type=payload.object_type,
        object_id=str(payload.object_id),
        policy_key=payload.policy_key,
        request_comment=payload.request_comment,
        status="pending",
    )
    db.add(approval)
    db.flush()

    step = ApprovalStep(
        approval_request_id=approval.id,
        step_no=1,
        approver_role="director",
    )
    db.add(step)
    db.commit()
    db.refresh(approval)
    return ApprovalEnvelope(data=ApprovalData.model_validate(approval))


@router.post("/approvals/{approval_id}:decision", response_model=MessageEnvelope)
def decide_approval(approval_id: str, payload: ApprovalDecisionRequest, db: DBSession) -> MessageEnvelope:
    approval = db.execute(select(ApprovalRequest).where(ApprovalRequest.id == approval_id)).scalar_one_or_none()
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval request not found")

    step = db.execute(
        select(ApprovalStep).where(ApprovalStep.approval_request_id == approval_id).order_by(ApprovalStep.step_no.desc())
    ).scalars().first()
    if step is None:
        step = ApprovalStep(approval_request_id=approval.id, step_no=1)
        db.add(step)

    step.decision = payload.decision
    step.comment = payload.comment
    step.decided_at = datetime.now(timezone.utc)

    mapping = {
        "approve": "approved",
        "reject": "rejected",
        "request_changes": "changes_requested",
    }
    approval.status = mapping[payload.decision]
    db.add(step)
    db.add(approval)
    db.commit()
    return MessageEnvelope(data=MessageData(message="Approval decision recorded", extra={"status": approval.status}))


@router.get("/approvals/{approval_id}", response_model=ApprovalEnvelope)
def get_approval_request(approval_id: str, db: DBSession) -> ApprovalEnvelope:
    approval = db.execute(select(ApprovalRequest).where(ApprovalRequest.id == approval_id)).scalar_one_or_none()
    if approval is None:
        raise HTTPException(status_code=404, detail="Approval request not found")
    return ApprovalEnvelope(data=ApprovalData.model_validate(approval))


@router.get("/projects/{project_id}/approvals", response_model=EnvelopeApprovals)
def list_project_approvals(project_id: str, db: DBSession) -> EnvelopeApprovals:
    approvals = db.execute(
        select(ApprovalRequest).where(ApprovalRequest.project_id == project_id).order_by(ApprovalRequest.requested_at.desc())
    ).scalars().all()
    return EnvelopeApprovals(data=[ApprovalData.model_validate(item) for item in approvals])
