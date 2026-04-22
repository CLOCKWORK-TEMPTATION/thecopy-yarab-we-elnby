from __future__ import annotations

from dataclasses import dataclass
from typing import Dict, List


@dataclass(frozen=True)
class AgentSpec:
    code: str
    name: str
    purpose: str
    input_schema: str
    output_schema: str
    approval_required: bool
    allowed_tools: List[str]


AGENTS: Dict[str, AgentSpec] = {
    "A00": AgentSpec(
        code="A00",
        name="Director Orchestrator Agent",
        purpose="تنسيق خطة التنفيذ وتشغيل الوكلاء الآخرين",
        input_schema="workflow_plan_request",
        output_schema="workflow_plan",
        approval_required=False,
        allowed_tools=["policy_engine", "workflow_launcher", "search", "approvals"],
    ),
    "A01": AgentSpec(
        code="A01",
        name="Script Ingestion Agent",
        purpose="رفع النص واستخراج المحتوى وإنشاء script_version",
        input_schema="script_ingest_request",
        output_schema="script_ingest_result",
        approval_required=False,
        allowed_tools=["storage", "checksum", "text_extraction"],
    ),
    "A02": AgentSpec(
        code="A02",
        name="Scene Parser Agent",
        purpose="تحويل النسخة النصية إلى مشاهد منظمة",
        input_schema="script_parse_request",
        output_schema="script_parse_result",
        approval_required=False,
        allowed_tools=["structured_outputs", "schema_validator"],
    ),
    "A03": AgentSpec(
        code="A03",
        name="Breakdown Agent",
        purpose="إنتاج breakdown تشغيلي للمشهد",
        input_schema="scene_breakdown_request",
        output_schema="scene_breakdown",
        approval_required=True,
        allowed_tools=["entity_extractor", "schema_validator", "risk_classifier"],
    ),
    "A05": AgentSpec(
        code="A05",
        name="Visual Bible Agent",
        purpose="بناء الـvisual bible",
        input_schema="visual_bible_generate_request",
        output_schema="visual_bible",
        approval_required=True,
        allowed_tools=["multimodal_reasoner", "image_generator", "provenance_service"],
    ),
    "A06": AgentSpec(
        code="A06",
        name="Storyboard Agent",
        purpose="توليد storyboard frames",
        input_schema="storyboard_generate_request",
        output_schema="storyboard_result",
        approval_required=True,
        allowed_tools=["image_generator", "asset_versioning", "provenance_service"],
    ),
    "A07": AgentSpec(
        code="A07",
        name="Shot Planner Agent",
        purpose="توليد shot list قابلة للتنفيذ",
        input_schema="shotlist_generate_request",
        output_schema="shotlist_result",
        approval_required=True,
        allowed_tools=["coverage_checker", "schema_validator"],
    ),
    "A08": AgentSpec(
        code="A08",
        name="Previs Video Agent",
        purpose="توليد previs clips قصيرة",
        input_schema="previs_generate_request",
        output_schema="previs_result",
        approval_required=True,
        allowed_tools=["video_generator", "prompt_translator", "provenance_service"],
    ),
    "A09": AgentSpec(
        code="A09",
        name="Scheduling Agent",
        purpose="إنتاج schedule versions",
        input_schema="schedule_generate_request",
        output_schema="schedule_version_result",
        approval_required=True,
        allowed_tools=["constraint_engine", "conflict_detector"],
    ),
    "A10": AgentSpec(
        code="A10",
        name="Call Sheet Agent",
        purpose="إنتاج call sheet يومية",
        input_schema="call_sheet_generate_request",
        output_schema="call_sheet_result",
        approval_required=True,
        allowed_tools=["templating_engine", "policy_checker"],
    ),
    "A11": AgentSpec(
        code="A11",
        name="Live Voice Copilot",
        purpose="جلسات صوتية حية مع المخرج والفريق",
        input_schema="realtime_session_request",
        output_schema="realtime_session_result",
        approval_required=False,
        allowed_tools=["realtime_transport", "retrieval", "note_writer"],
    ),
    "A12": AgentSpec(
        code="A12",
        name="Transcription Agent",
        purpose="تفريغ التسجيلات مع diarization",
        input_schema="transcription_request",
        output_schema="transcript_result",
        approval_required=False,
        allowed_tools=["transcription_provider", "chunker", "normalizer"],
    ),
    "A13": AgentSpec(
        code="A13",
        name="Continuity Agent",
        purpose="كشف انكسارات الاستمرارية",
        input_schema="continuity_report_request",
        output_schema="continuity_report",
        approval_required=False,
        allowed_tools=["comparison_engine", "retrieval", "contradiction_detector"],
    ),
    "A14": AgentSpec(
        code="A14",
        name="Dailies QA Agent",
        purpose="فحص اليوم المصور واكتشاف النواقص",
        input_schema="dailies_qa_request",
        output_schema="dailies_report",
        approval_required=False,
        allowed_tools=["coverage_checker", "editorial_packager"],
    ),
    "A15": AgentSpec(
        code="A15",
        name="Editorial Handoff Agent",
        purpose="إنتاج OTIO export وحزمة التسليم",
        input_schema="editorial_export_request",
        output_schema="editorial_export_result",
        approval_required=True,
        allowed_tools=["otio_adapter", "ffmpeg", "bundle_packager"],
    ),
    "A16": AgentSpec(
        code="A16",
        name="Search Librarian Agent",
        purpose="إدارة البحث الموحد",
        input_schema="project_search_request",
        output_schema="search_result",
        approval_required=False,
        allowed_tools=["fts", "vector_search", "reranker"],
    ),
    "A17": AgentSpec(
        code="A17",
        name="Provenance & Approval Agent",
        purpose="التحقق من provenance وإدارة الاعتمادات",
        input_schema="approval_or_provenance_request",
        output_schema="approval_or_provenance_result",
        approval_required=False,
        allowed_tools=["approval_engine", "signature_verifier", "audit_logger"],
    ),
}
