# Security and Reliability Improvements

Date: 2025-02-14

## Runtime resilience
- Mounted `/app/logs` as `tmpfs` alongside `/tmp` to keep a read-only root filesystem while ensuring Spring Boot can write logs and temporary files at runtime.

## Least-privilege execution
- Services run as a non-root user inside their runtime images to reduce the impact of an application compromise.

## Container hardening
- Enabled `no-new-privileges` and dropped all Linux capabilities for application containers to limit escalation paths.
- Set `read_only: true` for application containers to prevent on-disk tampering, paired with targeted writable `tmpfs` mounts.

## Network segmentation
- Moved database services onto an internal backend network to avoid direct host exposure.
- Separated observability services onto a dedicated network, with Prometheus attached to backend only for scraping.
