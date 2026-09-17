param(
    [Parameter(ValueFromRemainingArguments = $true)]
    [string[]]$CodexArguments
)

& codex --full-auto @CodexArguments
exit $LASTEXITCODE
