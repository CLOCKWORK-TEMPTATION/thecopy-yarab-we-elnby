from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, HTTPException
from sqlalchemy import select

from app.core.database import session_scope
from app.core.deps import DBSession
from app.models import Asset, Recording, Transcript, TranscriptSegment
from app.schemas import (
    AsyncJobAccepted,
    AsyncJobData,
    EnvelopeTranscript,
    RecordingCreateRequest,
    RecordingData,
    RecordingEnvelope,
    TranscriptData,
    TranscriptSegmentData,
    TranscriptSegmentsEnvelope,
    TranscriptionRequest,
)
from app.services.storage import read_text_from_path
from app.services.workflow_service import create_workflow, log_event, update_workflow_status

router = APIRouter(tags=["recordings"])


def _accepted(workflow_id: str, job_type: str) -> AsyncJobAccepted:
    return AsyncJobAccepted(
        data=AsyncJobData(
            workflow_id=workflow_id,
            job_type=job_type,
            status="queued",
            status_url=f"/api/v1/workflows/{workflow_id}",
            events_url=f"/api/v1/workflows/{workflow_id}/events",
        )
    )


@router.post("/recordings", response_model=RecordingEnvelope, status_code=201)
def create_recording(payload: RecordingCreateRequest, db: DBSession) -> RecordingEnvelope:
    asset = db.execute(select(Asset).where(Asset.id == str(payload.asset_id))).scalar_one_or_none()
    if asset is None:
        raise HTTPException(status_code=404, detail="Asset not found")
    recording = Recording(
        project_id=asset.project_id,
        scene_id=str(payload.scene_id) if payload.scene_id else None,
        shooting_day_id=str(payload.shooting_day_id) if payload.shooting_day_id else None,
        take_id=str(payload.take_id) if payload.take_id else None,
        asset_id=asset.id,
        recording_kind=payload.recording_kind,
        metadata_json={"source_asset_type": asset.asset_media_type},
    )
    db.add(recording)
    db.commit()
    db.refresh(recording)
    return RecordingEnvelope(data=RecordingData.model_validate(recording))


@router.get("/recordings/{recording_id}", response_model=RecordingEnvelope)
def get_recording(recording_id: str, db: DBSession) -> RecordingEnvelope:
    recording = db.execute(select(Recording).where(Recording.id == recording_id)).scalar_one_or_none()
    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")
    return RecordingEnvelope(data=RecordingData.model_validate(recording))



def _transcription_task(workflow_id: str, recording_id: str, payload: dict) -> None:
    with session_scope() as db:
        update_workflow_status(db, workflow_id, status="running", message="Transcribing recording")
        recording = db.execute(select(Recording).where(Recording.id == recording_id)).scalar_one()
        asset = db.execute(select(Asset).where(Asset.id == recording.asset_id)).scalar_one()

        try:
            text = read_text_from_path(asset.storage_uri)
            transcript_status = "succeeded"
        except Exception:
            text = "تعذر التفريغ الآلي في نسخة MVP الحالية لهذا النوع من الملفات. يرجى دمج مزود تفريغ صوتي لإكمال المسار."
            transcript_status = "partial"

        transcript = Transcript(
            recording_id=recording.id,
            provider=payload.get("provider", "auto"),
            model_name=payload.get("model", "gpt-4o-transcribe-diarize"),
            language_code=payload.get("language_code", "ar"),
            diarization_enabled=payload.get("speaker_diarization", True),
            full_text=text,
            status=transcript_status,
        )
        db.add(transcript)
        db.flush()

        paragraphs = [segment.strip() for segment in text.split("\n") if segment.strip()]
        for index, paragraph in enumerate(paragraphs[:100], start=1):
            segment = TranscriptSegment(
                transcript_id=transcript.id,
                segment_index=index,
                speaker_label=f"SPEAKER_{1 if index % 2 else 2}" if payload.get("speaker_diarization", True) else None,
                start_ms=(index - 1) * 4000,
                end_ms=index * 4000,
                text=paragraph,
                confidence=0.75 if transcript_status == "succeeded" else None,
            )
            db.add(segment)
        db.flush()

        log_event(db, workflow_id, "transcript.ready", "Transcript generated", {"transcript_id": transcript.id})
        update_workflow_status(
            db,
            workflow_id,
            status="succeeded",
            output_json={"recording_id": recording.id, "transcript_id": transcript.id, "status": transcript.status},
            message="Transcription workflow completed",
        )


@router.post("/recordings/{recording_id}:transcribe", response_model=AsyncJobAccepted, status_code=202)
def transcribe_recording(
    recording_id: str,
    payload: TranscriptionRequest,
    background_tasks: BackgroundTasks,
    db: DBSession,
) -> AsyncJobAccepted:
    recording = db.execute(select(Recording).where(Recording.id == recording_id)).scalar_one_or_none()
    if recording is None:
        raise HTTPException(status_code=404, detail="Recording not found")
    workflow = create_workflow(
        db,
        project_id=recording.project_id,
        workflow_type="transcription",
        input_json=payload.model_dump(mode="json"),
    )
    background_tasks.add_task(_transcription_task, workflow.id, recording_id, payload.model_dump(mode="json"))
    return _accepted(workflow.id, "transcription")


@router.get("/transcripts/{transcript_id}", response_model=EnvelopeTranscript)
def get_transcript(transcript_id: str, db: DBSession) -> EnvelopeTranscript:
    transcript = db.execute(select(Transcript).where(Transcript.id == transcript_id)).scalar_one_or_none()
    if transcript is None:
        raise HTTPException(status_code=404, detail="Transcript not found")
    return EnvelopeTranscript(data=TranscriptData.model_validate(transcript))


@router.get("/transcripts/{transcript_id}/segments", response_model=TranscriptSegmentsEnvelope)
def list_transcript_segments(transcript_id: str, db: DBSession) -> TranscriptSegmentsEnvelope:
    transcript = db.execute(select(Transcript).where(Transcript.id == transcript_id)).scalar_one_or_none()
    if transcript is None:
        raise HTTPException(status_code=404, detail="Transcript not found")
    segments = db.execute(
        select(TranscriptSegment).where(TranscriptSegment.transcript_id == transcript_id).order_by(TranscriptSegment.segment_index.asc())
    ).scalars().all()
    return TranscriptSegmentsEnvelope(data=[TranscriptSegmentData.model_validate(segment) for segment in segments])
