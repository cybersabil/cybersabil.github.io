<#
CyberSabil Localhost Server - Any Folder Edition
Purpose:
- Hosts any static website folder on http://127.0.0.1:8000/
- Useful for testing GitHub Pages folders locally before uploading.
- Put this file inside the website folder and run it, or pass another folder path using -Root.

Examples:
1) Run from the same folder:
   Right-click this file > Run with PowerShell

2) Run for a different folder:
   powershell -ExecutionPolicy Bypass -File .\StartServer_AnyFolder_8000.ps1 -Root "D:\MyWebsiteFolder"

3) Run without opening browser:
   powershell -ExecutionPolicy Bypass -File .\StartServer_AnyFolder_8000.ps1 -Root "D:\MyWebsiteFolder" -NoBrowser
#>

param(
    # Website folder to serve. If empty, the script uses the folder where this PS1 file is placed.
    [string]$Root = "",

    # Localhost port. Default is 8000 as requested.
    [int]$Port = 8000,

    # Use this switch if you do not want the browser to open automatically.
    [switch]$NoBrowser
)

# -------------------------------
# Console setup
# Purpose: Makes the server window easier to identify while testing.
# -------------------------------
$Host.UI.RawUI.WindowTitle = "CyberSabil Local Server - Port $Port"

# -------------------------------
# Resolve website root folder
# Purpose: Supports any website folder without hardcoding one fixed path.
# -------------------------------
function Resolve-CyberSabilServerRoot {
    param([string]$InputRoot)

    # If no folder was passed, use the folder where this PS1 file is located.
    # This is safer than Get-Location because double-click/run behavior may change the current directory.
    if ([string]::IsNullOrWhiteSpace($InputRoot)) {
        $InputRoot = $PSScriptRoot
    }

    # Clean quotes that sometimes appear when users paste paths into PowerShell.
    $InputRoot = $InputRoot.Trim().Trim('"')

    if (!(Test-Path -LiteralPath $InputRoot -PathType Container)) {
        Write-Host "Folder not found: $InputRoot" -ForegroundColor Red
        Write-Host "Please enter a valid website folder path." -ForegroundColor Yellow
        $ManualRoot = Read-Host "Folder path"
        $ManualRoot = $ManualRoot.Trim().Trim('"')

        if (!(Test-Path -LiteralPath $ManualRoot -PathType Container)) {
            throw "Invalid folder path: $ManualRoot"
        }

        $InputRoot = $ManualRoot
    }

    return (Resolve-Path -LiteralPath $InputRoot).Path
}

try {
    $Root = Resolve-CyberSabilServerRoot -InputRoot $Root
} catch {
    Write-Host "Server cannot continue." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Pause
    exit 1
}

# -------------------------------
# Basic project check
# Purpose: Warns if the selected folder does not look like a website folder.
# -------------------------------
$IndexPath = Join-Path $Root "index.html"
if (!(Test-Path -LiteralPath $IndexPath -PathType Leaf)) {
    Write-Host "Warning: index.html was not found in this folder." -ForegroundColor Yellow
    Write-Host "Root: $Root" -ForegroundColor Gray
    $Continue = Read-Host "Continue anyway? Type Y to continue"
    if ($Continue -notin @("Y", "y", "YES", "yes")) {
        Write-Host "Cancelled by user." -ForegroundColor Red
        exit 1
    }
}

# -------------------------------
# MIME type map
# Purpose: Sends correct content types for HTML, CSS, JS, JSON, images, fonts, and common files.
# -------------------------------
$MimeTypes = @{
    ".html" = "text/html; charset=utf-8"
    ".htm"  = "text/html; charset=utf-8"
    ".css"  = "text/css; charset=utf-8"
    ".js"   = "application/javascript; charset=utf-8"
    ".mjs"  = "application/javascript; charset=utf-8"
    ".json" = "application/json; charset=utf-8"
    ".txt"  = "text/plain; charset=utf-8"
    ".md"   = "text/markdown; charset=utf-8"
    ".xml"  = "application/xml; charset=utf-8"
    ".svg"  = "image/svg+xml"
    ".png"  = "image/png"
    ".jpg"  = "image/jpeg"
    ".jpeg" = "image/jpeg"
    ".gif"  = "image/gif"
    ".webp" = "image/webp"
    ".ico"  = "image/x-icon"
    ".woff" = "font/woff"
    ".woff2"= "font/woff2"
    ".ttf"  = "font/ttf"
    ".otf"  = "font/otf"
    ".pdf"  = "application/pdf"
    ".zip"  = "application/zip"
}

# -------------------------------
# Server URL
# Purpose: Uses localhost/127.0.0.1 on port 8000 for local testing.
# -------------------------------
$Url = "http://127.0.0.1:$Port/"
$OpenUrl = "http://127.0.0.1:$Port/index.html"

# -------------------------------
# Start HTTP listener
# Purpose: Serves the selected folder as a local static website.
# -------------------------------
$Listener = New-Object System.Net.HttpListener
$Listener.Prefixes.Add($Url)

try {
    $Listener.Start()
} catch {
    Write-Host "Server start failed." -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Yellow
    Write-Host "" 
    Write-Host "Possible reasons:" -ForegroundColor Cyan
    Write-Host "1. Port $Port is already in use." -ForegroundColor Gray
    Write-Host "2. Another local server is already running." -ForegroundColor Gray
    Write-Host "3. Windows URL permission issue." -ForegroundColor Gray
    Write-Host "" 
    Write-Host "Try closing the old server window or run with another port:" -ForegroundColor Yellow
    Write-Host "powershell -ExecutionPolicy Bypass -File .\StartServer_AnyFolder_8000.ps1 -Port 8080" -ForegroundColor Gray
    Pause
    exit 1
}

Write-Host "" 
Write-Host "CyberSabil Local Server Started" -ForegroundColor Cyan
Write-Host "Root: $Root" -ForegroundColor Gray
Write-Host "URL : $Url" -ForegroundColor Green
Write-Host "Open: $OpenUrl" -ForegroundColor Green
Write-Host "" 
Write-Host "Press Ctrl + C to stop the server." -ForegroundColor Yellow
Write-Host "" 

# -------------------------------
# Auto-open browser
# Purpose: Opens index.html directly so the user can test the website immediately.
# -------------------------------
if (!$NoBrowser) {
    Start-Process $OpenUrl
}

# -------------------------------
# Request loop
# Purpose: Reads browser requests, finds files from the selected folder, and returns responses.
# -------------------------------
try {
    while ($Listener.IsListening) {
        $Context = $Listener.GetContext()
        $RequestPath = $Context.Request.Url.LocalPath

        # Default route maps / to /index.html.
        if ($RequestPath -eq "/") {
            $RequestPath = "/index.html"
        }

        # Decode URL path and map web paths to Windows paths.
        $RequestPath = [Uri]::UnescapeDataString($RequestPath)
        $RelativePath = $RequestPath.TrimStart("/") -replace "/", "\"
        $FilePath = Join-Path $Root $RelativePath

        # Security check: prevents requests from escaping outside the selected website folder.
        try {
            $ResolvedRoot = (Resolve-Path -LiteralPath $Root).Path
            $ResolvedCandidate = $null
            if (Test-Path -LiteralPath $FilePath) {
                $ResolvedCandidate = (Resolve-Path -LiteralPath $FilePath).Path
            }
            if ($ResolvedCandidate -and !$ResolvedCandidate.StartsWith($ResolvedRoot, [System.StringComparison]::OrdinalIgnoreCase)) {
                throw "Blocked path traversal attempt."
            }
        } catch {
            $Bytes = [Text.Encoding]::UTF8.GetBytes("403 - Forbidden")
            $Context.Response.StatusCode = 403
            $Context.Response.ContentType = "text/plain; charset=utf-8"
            $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
            $Context.Response.Close()
            continue
        }

        # Return 404 if the requested file does not exist.
        if (!(Test-Path -LiteralPath $FilePath -PathType Leaf)) {
            $Bytes = [Text.Encoding]::UTF8.GetBytes("404 - File not found: $RequestPath")
            $Context.Response.StatusCode = 404
            $Context.Response.ContentType = "text/plain; charset=utf-8"
            $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
            $Context.Response.Close()
            continue
        }

        # Select content type from extension.
        $Extension = [IO.Path]::GetExtension($FilePath).ToLower()
        $ContentType = $MimeTypes[$Extension]
        if (!$ContentType) {
            $ContentType = "application/octet-stream"
        }

        # Read and return the file.
        # Cache disabled to make local testing easier after CSS/JS changes.
        $Bytes = [IO.File]::ReadAllBytes($FilePath)
        $Context.Response.StatusCode = 200
        $Context.Response.ContentType = $ContentType
        $Context.Response.ContentLength64 = $Bytes.Length
        $Context.Response.Headers.Add("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        $Context.Response.Headers.Add("Pragma", "no-cache")
        $Context.Response.OutputStream.Write($Bytes, 0, $Bytes.Length)
        $Context.Response.Close()
    }
} finally {
    # Cleanup
    # Purpose: Frees the port when the server stops.
    if ($Listener -and $Listener.IsListening) {
        $Listener.Stop()
    }
    if ($Listener) {
        $Listener.Close()
    }
}
