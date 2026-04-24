# Terraform Scan Improvements (KISS Approach)

This roadmap focuses on high-value, low-complexity improvements to ensure infrastructure quality and security.

## 1. Core Security Gate (tfsec)
- **Status:** Integrated.
- **Improvement:** Ensure `tfsec` runs on every PR to catch the "Top 10" AWS misconfigurations (e.g., open S3 buckets, wide-open Security Groups).

## 2. Infrastructure Linting (TFLint)
- **Status:** Integrated.
- **Improvement:** Use the standard AWS ruleset to enforce naming conventions and resource presence (e.g., ensuring every resource has an `Environment` tag).

## 3. Visual Feedback
- **Status:** Integrated.
- **Improvement:** Utilize CodeBuild's native "Reports" tab by outputting scan results in JUNIT format. This provides a clean UI for consultants and clients to review security status without digging through raw logs.

## 4. Documentation as Code
- Keep Terraform modules small and well-documented with `README.md` files for each module, explaining *why* certain security choices were made.
