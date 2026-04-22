from __future__ import annotations

from datetime import datetime
from typing import Any, Literal
from uuid import UUID, uuid4

from pydantic import BaseModel, ConfigDict, Field


class ORMModel(BaseModel):
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())


class Meta(BaseModel):
    request_id: str = Field(default_factory=lambda: str(uuid4()))
    trace_id: str = Field(default_factory=lambda: str(uuid4()))
    version: str = "v1"


class ErrorDetail(BaseModel):
    code: str
    message: str
    details: dict[str, Any] = Field(default_factory=dict)
    retryable: bool = False


class ErrorEnvelope(BaseModel):
    error: ErrorDetail
    meta: Meta = Field(default_factory=Meta)


class MessageData(BaseModel):
    message: str
    extra: dict[str, Any] = Field(default_factory=dict)


class MessageEnvelope(BaseModel):
    data: MessageData
    meta: Meta = Field(default_factory=Meta)


class AsyncJobData(BaseModel):
    workflow_id: str
    job_type: str
    status: Literal["queued", "running", "waiting_approval", "succeeded", "failed", "cancelled"]
    status_url: str
    events_url: str | None = None


class AsyncJobAccepted(BaseModel):
    data: AsyncJobData
    meta: Meta = Field(default_factory=Meta)


class ProjectCreateRequest(BaseModel):
    project_type: Literal["film", "series"]
    title_ar: str
    title_en: str | None = None
    slug: str
    default_language_code: str = "ar"
    default_dialect_code: str | None = "ar-EG"
    logline: str | None = None
    synopsis: str | None = None


class Project(ORMModel):
    id: UUID
    workspace_id: UUID
    project_type: str
    title_ar: str
    title_en: str | None = None
    slug: str
    status: str
    default_language_code: str
    default_dialect_code: str | None = None
    logline: str | None = None
    synopsis: str | None = None
    created_at: datetime
    updated_at: datetime


class EnvelopeProject(BaseModel):
    data: Project
    meta: Meta = Field(default_factory=Meta)


class EnvelopeProjects(BaseModel):
    data: list[Project]
    meta: Meta = Field(default_factory=Meta)


class ScriptData(ORMModel):
    id: UUID
    project_id: UUID
    episode_id: UUID | None = None
    canonical_name: str
    current_version_id: UUID | None = None
    created_at: datetime
    updated_at: datetime


class ScriptVersionData(ORMModel):
    id: UUID
    script_id: UUID
    version_no: int
    label: str | None = None
    status: str
    source_asset_id: UUID | None = None
    hash_sha256: str | None = None
    parsed_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class EnvelopeScript(BaseModel):
    data: ScriptData
    meta: Meta = Field(default_factory=Meta)


class EnvelopeScriptVersion(BaseModel):
    data: ScriptVersionData
    meta: Meta = Field(default_factory=Meta)


class SceneData(ORMModel):
    id: UUID
    project_id: UUID
    script_version_id: UUID
    stable_scene_key: str
    script_scene_number: int
    order_index: int
    slugline: str
    int_ext: str
    time_of_day: str
    primary_location: str | None = None
    summary: str | None = None
    scene_text: str | None = None
    dialogue_text: str | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class EnvelopeScene(BaseModel):
    data: SceneData
    meta: Meta = Field(default_factory=Meta)


class EnvelopeScenes(BaseModel):
    data: list[SceneData]
    meta: Meta = Field(default_factory=Meta)


class SceneBreakdownData(ORMModel):
    id: UUID
    scene_id: UUID
    risk_level: str
    vfx_required: bool
    sfx_required: bool
    crowd_count: int
    minors_count: int
    animals_count: int
    vehicle_count: int
    weather_notes: str | None = None
    special_notes: str | None = None
    breakdown_json: dict[str, Any] = Field(default_factory=dict)


class EnvelopeSceneBreakdown(BaseModel):
    data: SceneBreakdownData
    meta: Meta = Field(default_factory=Meta)


class VisualBibleData(ORMModel):
    id: UUID
    project_id: UUID
    episode_id: UUID | None = None
    version_no: int
    style_manifest_json: dict[str, Any] = Field(default_factory=dict)
    reference_pack_json: dict[str, Any] = Field(default_factory=dict)
    status: str
    created_at: datetime


class StoryboardData(ORMModel):
    id: UUID
    project_id: UUID
    scene_id: UUID
    version_no: int
    source_visual_bible_id: UUID | None = None
    prompt_pack_json: dict[str, Any] = Field(default_factory=dict)
    status: str
    created_at: datetime


class ShotData(ORMModel):
    id: UUID
    shotlist_id: UUID
    stable_shot_key: str
    order_index: int
    shot_code: str
    framing: str | None = None
    camera_angle: str | None = None
    movement: str | None = None
    lens_hint: str | None = None
    duration_estimate_sec: int | None = None
    audio_plan: str | None = None
    blocking_notes: str | None = None
    continuity_notes: str | None = None
    shot_schema_json: dict[str, Any] = Field(default_factory=dict, alias="schema_json")


class ShotlistData(ORMModel):
    id: UUID
    project_id: UUID
    scene_id: UUID
    version_no: int
    status: str
    coverage_matrix_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class ScheduleVersionData(ORMModel):
    id: UUID
    project_id: UUID
    version_no: int
    constraints_json: dict[str, Any] = Field(default_factory=dict)
    optimization_summary: str | None = None
    status: str
    created_at: datetime


class EnvelopeScheduleVersion(BaseModel):
    data: ScheduleVersionData
    meta: Meta = Field(default_factory=Meta)


class ScheduleEntryData(ORMModel):
    id: UUID
    schedule_version_id: UUID
    shooting_day_id: UUID
    scene_id: UUID
    shot_id: UUID | None = None
    planned_start_at: str | None = None
    planned_end_at: str | None = None
    order_index: int
    cast_requirements_json: dict[str, Any] = Field(default_factory=dict)
    crew_requirements_json: dict[str, Any] = Field(default_factory=dict)
    logistics_json: dict[str, Any] = Field(default_factory=dict)


class ShootingDayData(ORMModel):
    id: UUID
    project_id: UUID
    shoot_date: datetime | str
    unit_no: int
    base_location: str | None = None
    status: str
    notes_json: dict[str, Any] = Field(default_factory=dict)


class CallSheetData(ORMModel):
    id: UUID
    project_id: UUID
    shooting_day_id: UUID
    version_no: int
    status: str
    summary_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class EnvelopeCallSheet(BaseModel):
    data: CallSheetData
    meta: Meta = Field(default_factory=Meta)


class RealtimeSessionCreateRequest(BaseModel):
    project_id: UUID
    scene_id: UUID | None = None
    mode: Literal["voice_copilot", "rehearsal", "notes_only"] = "voice_copilot"
    language_code: str = "ar-EG"
    input_modalities: list[str] = Field(default_factory=lambda: ["audio", "text"])
    output_modalities: list[str] = Field(default_factory=lambda: ["audio", "text"])
    provider_preference: Literal["auto", "openai", "google"] = "auto"


class RealtimeSessionData(ORMModel):
    id: UUID
    project_id: UUID
    scene_id: UUID | None = None
    mode: str
    language_code: str
    provider_preference: str
    transport: Literal["ws", "webrtc"] = "ws"
    client_token: str | None = None
    session_url: str | None = None
    expires_at: datetime


class RealtimeSessionEnvelope(BaseModel):
    data: RealtimeSessionData
    meta: Meta = Field(default_factory=Meta)


class RecordingCreateRequest(BaseModel):
    asset_id: UUID
    recording_kind: Literal["rehearsal", "meeting", "on_set_note", "dailies_audio", "other"]
    scene_id: UUID | None = None
    shooting_day_id: UUID | None = None
    take_id: UUID | None = None


class RecordingData(ORMModel):
    id: UUID
    project_id: UUID
    asset_id: UUID
    recording_kind: str
    scene_id: UUID | None = None
    shooting_day_id: UUID | None = None
    take_id: UUID | None = None
    captured_at: datetime
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class RecordingEnvelope(BaseModel):
    data: RecordingData
    meta: Meta = Field(default_factory=Meta)


class TranscriptData(ORMModel):
    id: UUID
    recording_id: UUID
    provider: str
    model_name: str
    language_code: str
    diarization_enabled: bool
    full_text: str
    status: str
    created_at: datetime


class EnvelopeTranscript(BaseModel):
    data: TranscriptData
    meta: Meta = Field(default_factory=Meta)


class TranscriptSegmentData(ORMModel):
    id: UUID
    transcript_id: UUID
    segment_index: int
    speaker_label: str | None = None
    start_ms: int
    end_ms: int
    text: str
    confidence: float | None = None
    metadata_json: dict[str, Any] = Field(default_factory=dict)


class TranscriptSegmentsEnvelope(BaseModel):
    data: list[TranscriptSegmentData]
    meta: Meta = Field(default_factory=Meta)


class ScriptParseRequest(BaseModel):
    mode: Literal["single_script", "episode_aware"] = "single_script"
    language_code: str = "ar"
    dialect_code: str = "ar-EG"
    generate_scene_cards: bool = True


class SceneBreakdownRequest(BaseModel):
    include_entities: bool = True
    include_risks: bool = True
    approval_mode: Literal["draft", "submit"] = "draft"


class VisualBibleGenerateRequest(BaseModel):
    scope: Literal["project", "episode"] = "project"
    episode_id: UUID | None = None
    reference_asset_ids: list[UUID] = Field(default_factory=list)
    style_intent: str | None = None
    output_depth: Literal["light", "standard", "deep"] = "standard"


class StoryboardGenerateRequest(BaseModel):
    source_visual_bible_id: UUID | None = None
    frame_count_hint: int = 8
    consistency_mode: Literal["standard", "strict"] = "strict"
    approval_mode: Literal["draft", "submit"] = "draft"


class ShotlistGenerateRequest(BaseModel):
    source_storyboard_id: UUID | None = None
    coverage_goal: Literal["minimal", "balanced", "full"] = "balanced"
    camera_style: str | None = None
    blocking_intent: str | None = None
    approval_mode: Literal["draft", "submit"] = "draft"


class PrevisGenerateRequest(BaseModel):
    source_storyboard_id: UUID
    source_shotlist_id: UUID
    duration_sec: int = 20
    aspect_ratio: str = "16:9"
    quality_profile: Literal["draft", "preview", "high"] = "preview"


class ScheduleGenerateRequest(BaseModel):
    horizon: Literal["day", "week", "full_project"] = "full_project"
    constraints: dict[str, Any] = Field(default_factory=dict)
    strategy: Literal["fast", "balanced", "cost_aware"] = "balanced"


class CallSheetGenerateRequest(BaseModel):
    schedule_version_id: UUID
    template_key: str = "standard"
    include_transport: bool = False
    approval_mode: Literal["draft", "submit"] = "draft"


class TranscriptionRequest(BaseModel):
    provider: Literal["openai", "google", "auto"] = "auto"
    model: str = "gpt-4o-transcribe-diarize"
    language_code: str = "ar"
    speaker_diarization: bool = True


class ContinuityReportRequest(BaseModel):
    compare_against: list[Literal["script", "shotlist", "storyboard", "takes", "notes", "transcripts"]] = Field(default_factory=list)
    severity_threshold: Literal["low", "medium", "high"] = "medium"
    include_resolution_hints: bool = True


class DailiesQARequest(BaseModel):
    take_ids: list[UUID] = Field(default_factory=list)
    transcript_ids: list[UUID] = Field(default_factory=list)
    expected_scene_ids: list[UUID] = Field(default_factory=list)
    mode: Literal["coverage", "continuity", "editorial"] = "coverage"


class ApprovalRequestCreate(BaseModel):
    object_type: str
    object_id: UUID
    policy_key: str
    request_comment: str | None = None
    project_id: UUID


class ApprovalDecisionRequest(BaseModel):
    decision: Literal["approve", "reject", "request_changes"]
    comment: str | None = None


class ApprovalData(ORMModel):
    id: UUID
    status: str
    project_id: UUID
    object_type: str
    object_id: UUID
    policy_key: str
    request_comment: str | None = None
    requested_at: datetime


class ApprovalEnvelope(BaseModel):
    data: ApprovalData
    meta: Meta = Field(default_factory=Meta)


class EnvelopeApprovals(BaseModel):
    data: list[ApprovalData]
    meta: Meta = Field(default_factory=Meta)


class ProjectSearchRequest(BaseModel):
    query: str
    project_id: UUID
    filters: dict[str, Any] = Field(default_factory=dict)
    top_k: int = 10


class SearchHit(BaseModel):
    rank: int
    source_type: str
    source_id: UUID
    snippet: str
    score: float
    source_ref: str | None = None


class SearchEnvelope(BaseModel):
    data: list[SearchHit]
    meta: Meta = Field(default_factory=Meta)


class EditorialExportRequest(BaseModel):
    scope: Literal["day", "scene", "episode", "project"] = "day"
    shooting_day_id: UUID | None = None
    scene_id: UUID | None = None
    episode_id: UUID | None = None
    include_notes: bool = True
    include_selected_takes_only: bool = True
    format: Literal["otio"] = "otio"


class ProvenanceVerifyRequest(BaseModel):
    asset_version_id: UUID
    strict: bool = True


class ProvenanceData(BaseModel):
    asset_version_id: UUID
    verification_status: Literal["unknown", "verified", "failed", "not_available"]
    manifest_uri: str | None = None


class ProvenanceEnvelope(BaseModel):
    data: ProvenanceData
    meta: Meta = Field(default_factory=Meta)


class WorkflowStatusData(ORMModel):
    id: UUID
    project_id: UUID
    workflow_type: str
    status: str
    input_json: dict[str, Any] = Field(default_factory=dict)
    output_json: dict[str, Any] = Field(default_factory=dict)
    error_json: dict[str, Any] = Field(default_factory=dict)
    started_at: datetime
    finished_at: datetime | None = None


class WorkflowStatusEnvelope(BaseModel):
    data: WorkflowStatusData
    meta: Meta = Field(default_factory=Meta)


class WorkflowEventData(ORMModel):
    id: UUID
    workflow_run_id: UUID
    event_type: str
    message: str
    payload_json: dict[str, Any] = Field(default_factory=dict)
    created_at: datetime


class WorkflowEventsEnvelope(BaseModel):
    data: list[WorkflowEventData]
    meta: Meta = Field(default_factory=Meta)
