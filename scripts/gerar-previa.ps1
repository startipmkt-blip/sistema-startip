# Gera a prévia leve (1080p H.264, ~5 Mbps) de um vídeo do Drive para a aprovação do cliente.
# O original no Drive NÃO é alterado. Uso:
#   .\scripts\gerar-previa.ps1 -Link "https://drive.google.com/file/d/ID/view" -Arquivo "C:\...\original.mp4"
# Gera public\previas\ID.mp4; depois é só commitar e dar push (o deploy publica).
param([Parameter(Mandatory)][string]$Link, [Parameter(Mandatory)][string]$Arquivo)
if ($Link -notmatch '/d/([A-Za-z0-9_-]{10,80})') { throw 'Link do Drive inválido' }
$id = $Matches[1]
$saida = Join-Path $PSScriptRoot "..\public\previas\$id.mp4"
New-Item -ItemType Directory -Force (Split-Path $saida) | Out-Null
ffmpeg -y -i $Arquivo -vf "scale='min(1080,iw)':-2,fps=30" -c:v libx264 -profile:v high -pix_fmt yuv420p -crf 23 -maxrate 6M -bufsize 12M -preset medium -c:a aac -b:a 128k -movflags +faststart $saida
"Prévia criada: $saida"
