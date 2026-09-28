$content = Get-Content -Raw "C:\Users\my\.gemini\antigravity-ide\brain\015b56bb-3aba-405f-9478-2a184a1ef2bf\scratch\prev_transcript.txt"
$lines = $content -split "`r?`n"
foreach ($l in $lines) {
    if ($l.Trim().Length -gt 0) {
        try {
            $json = $l | ConvertFrom-Json
            if ($json.type -eq "PLANNER_RESPONSE") {
                [System.IO.File]::WriteAllText("C:\Users\my\.gemini\antigravity-ide\brain\015b56bb-3aba-405f-9478-2a184a1ef2bf\scratch\extracted_prompt.md", $json.content)
                Write-Host "Success! Extracted bytes: $($json.content.Length)"
            }
        } catch {
            Write-Host "JSON parse error: $_"
        }
    }
}
