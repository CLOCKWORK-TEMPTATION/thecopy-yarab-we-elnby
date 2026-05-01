# Persistent Agent Memory ERD

This document is operational documentation for implementation review.

The source of truth remains:

```text
output/session-state.md
```

```mermaid
erDiagram
  model_versions ||--o{ memory_candidates : labels
  sessions ||--o{ rounds : contains
  rounds ||--o{ state_snapshots : captures
  state_snapshots ||--o{ state_deltas : produces
  references ||--o{ raw_events : cites
  raw_events ||--o{ memory_candidates : yields
  memory_candidates ||--o{ memories : promotes
  memories ||--o{ decisions : records
  memories ||--o{ fact_versions : versions
  retrieval_events ||--o{ injection_events : audits
  job_runs ||--o{ dead_letter_jobs : fails_to

  model_versions {
    text id PK
    text provider
    text model
    text version
    integer dimensions
    jsonb metadata
  }

  raw_events {
    uuid id PK
    text source_ref
    text event_type
    text content_hash
    text raw_text
    jsonb metadata
  }

  secret_scan_events {
    uuid id PK
    text source_ref
    text event_type
    text content_hash
    text scanner_version
    jsonb finding_ids
    jsonb redacted_metadata
  }

  memory_candidates {
    uuid id PK
    uuid raw_event_id FK
    text source_ref
    text content_hash
    text content
    text model_version_id
    real injection_probability
  }

  memories {
    uuid id PK
    uuid candidate_id FK
    text source_ref
    text content_hash
    text content
    text memory_type
    text trust_level
    text model_version_id
  }

  retrieval_events {
    uuid id PK
    text query
    text intent
    jsonb result_memory_ids
  }

  injection_events {
    uuid id PK
    uuid retrieval_event_id FK
    text zone
    jsonb memory_ids
    boolean rejected
  }
```

Pre-storage rule:

```text
raw_events.raw_text is written only after memory secret scanning returns clean.
```

Rejected input rule:

```text
secret_scan_events stores only content hash, finding ids, and redacted metadata.
```

