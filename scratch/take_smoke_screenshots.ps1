$msedge = 'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'
$outDir = 'C:\Users\himan\.gemini\antigravity-ide\brain\11c7e23a-29a3-4c00-9dbe-4ff86a14b7d0\scratch\smoke'
if (-not (Test-Path $outDir)) {
    New-Item -ItemType Directory -Force -Path $outDir | Out-Null
}

$pages = @(
    @{ name = 'standards'; url = 'http://localhost:3000/consumer/standards' },
    @{ name = 'labs'; url = 'http://localhost:3000/consumer/laboratories' },
    @{ name = 'journey'; url = 'http://localhost:3000/consumer/journey' },
    @{ name = 'verify'; url = 'http://localhost:3000/consumer/verify' }
)

foreach ($p in $pages) {
    $deskOut = Join-Path $outDir "$($p.name)_desktop.png"
    $mobOut = Join-Path $outDir "$($p.name)_mobile.png"
    
    Write-Host "Capturing $($p.name) desktop..."
    Start-Process -FilePath $msedge -ArgumentList "--headless=new", "--screenshot=$deskOut", "--window-size=1280,900", "--virtual-time-budget=5000", $p.url -Wait -NoNewWindow
    
    Write-Host "Capturing $($p.name) mobile..."
    Start-Process -FilePath $msedge -ArgumentList "--headless=new", "--screenshot=$mobOut", "--window-size=375,812", "--virtual-time-budget=5000", $p.url -Wait -NoNewWindow
}

Get-ChildItem -Path $outDir | Select-Object Name, Length
