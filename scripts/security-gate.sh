#!/bin/bash
# Security Quality Gate Script
# Usage: ./security-gate.sh

set -e

echo "🔍 Evaluating security scan results..."

# Initialize counters
CRITICAL_VULNS=0
HIGH_VULNS=0
SECRETS_FOUND=0
SAST_ISSUES=0

# Check Trivy filesystem results
if [ -f "trivy-fs-results.json" ]; then
    CRITICAL_VULNS=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' trivy-fs-results.json 2>/dev/null || echo "0")
    HIGH_VULNS=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' trivy-fs-results.json 2>/dev/null || echo "0")
    echo "📊 Filesystem scan - Critical: $CRITICAL_VULNS, High: $HIGH_VULNS"
fi

# Check container image results
for service in cart-service order-service product-service summary-service; do
    if [ -f "trivy-image-$service-results.json" ]; then
        IMG_CRITICAL=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "CRITICAL")] | length' "trivy-image-$service-results.json" 2>/dev/null || echo "0")
        IMG_HIGH=$(jq '[.Results[]?.Vulnerabilities[]? | select(.Severity == "HIGH")] | length' "trivy-image-$service-results.json" 2>/dev/null || echo "0")
        CRITICAL_VULNS=$((CRITICAL_VULNS + IMG_CRITICAL))
        HIGH_VULNS=$((HIGH_VULNS + IMG_HIGH))
        echo "📊 $service image - Critical: $IMG_CRITICAL, High: $IMG_HIGH"
    fi
done

# Check Gitleaks results
if [ -f "gitleaks-results.json" ]; then
    SECRETS_FOUND=$(jq 'length' gitleaks-results.json 2>/dev/null || echo "0")
    echo "🔐 Secrets found: $SECRETS_FOUND"
fi

# Check Semgrep results
if [ -f "semgrep-results.json" ]; then
    SAST_ISSUES=$(jq '.results | length' semgrep-results.json 2>/dev/null || echo "0")
    echo "🔍 SAST issues found: $SAST_ISSUES"
fi

# Quality gate thresholds (configurable)
MAX_CRITICAL=${MAX_CRITICAL:-0}
MAX_HIGH=${MAX_HIGH:-5}
MAX_SECRETS=${MAX_SECRETS:-0}
MAX_SAST=${MAX_SAST:-10}

echo ""
echo "🎯 Security Quality Gates:"
echo "Critical vulnerabilities: $CRITICAL_VULNS (max: $MAX_CRITICAL)"
echo "High vulnerabilities: $HIGH_VULNS (max: $MAX_HIGH)"
echo "Secrets detected: $SECRETS_FOUND (max: $MAX_SECRETS)"
echo "SAST issues: $SAST_ISSUES (max: $MAX_SAST)"

# Evaluate gates
FAILED=0

if [ "$CRITICAL_VULNS" -gt "$MAX_CRITICAL" ]; then
    echo "❌ FAILED: $CRITICAL_VULNS critical vulnerabilities found (max: $MAX_CRITICAL)"
    FAILED=1
fi

if [ "$HIGH_VULNS" -gt "$MAX_HIGH" ]; then
    echo "❌ FAILED: $HIGH_VULNS high vulnerabilities found (max: $MAX_HIGH)"
    FAILED=1
fi

if [ "$SECRETS_FOUND" -gt "$MAX_SECRETS" ]; then
    echo "❌ FAILED: $SECRETS_FOUND secrets detected (max: $MAX_SECRETS)"
    FAILED=1
fi

if [ "$SAST_ISSUES" -gt "$MAX_SAST" ]; then
    echo "❌ FAILED: $SAST_ISSUES SAST issues found (max: $MAX_SAST)"
    FAILED=1
fi

if [ "$FAILED" -eq "1" ]; then
    echo ""
    echo "🚫 Security gate FAILED - Build should not proceed to production"
    exit 1
else
    echo ""
    echo "✅ Security gate PASSED - Build can proceed"
    exit 0
fi