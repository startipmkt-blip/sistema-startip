<?php
// Vídeo do Google Drive para a aprovação do cliente, servido pelo nosso domínio.
// - O link direto do Drive vem como download (attachment) e o iPhone não toca assim.
// - Cada trecho (Range) pedido ao Drive custa ~2 s de latência e os vídeos têm os metadados
//   no fim do arquivo → travava. Por isso a 1ª requisição guarda uma cópia local (cache) e
//   as seguintes são servidas do disco, instantâneas e com suporte a Range.
// Só aceita IDs de arquivo do Drive; só acessa drive.usercontent.google.com.

const MAX_BYTES = 300 * 1024 * 1024;   // não guarda vídeos maiores que isso (cai no proxy direto)
const VALIDADE  = 3 * 24 * 3600;       // cópias mais velhas que 3 dias são apagadas

$id = $_GET['id'] ?? '';
if (!preg_match('/^[A-Za-z0-9_-]{10,80}$/', $id)) {
    http_response_code(400);
    exit('id inválido');
}

@set_time_limit(0);
@ini_set('zlib.output_compression', '0');
while (ob_get_level() > 0) { ob_end_clean(); }

$origem = 'https://drive.usercontent.google.com/download?id=' . $id . '&export=download&confirm=t';
$dir    = rtrim(sys_get_temp_dir(), '/\') . '/startip-drive-video';
@mkdir($dir, 0700, true);
$arquivo = $dir . '/' . $id . '.mp4';

// Limpeza ocasional de cópias antigas.
if (mt_rand(1, 20) === 1) {
    foreach (glob($dir . '/*') ?: [] as $f) {
        if (is_file($f) && filemtime($f) < time() - VALIDADE) { @unlink($f); }
    }
}

/** Baixa o vídeo inteiro para $destino. Retorna true se for um vídeo válido. */
function baixar(string $url, string $destino): bool {
    $tmp = $destino . '.' . bin2hex(random_bytes(4)) . '.part';
    $fh = @fopen($tmp, 'wb');
    if (!$fh) { return false; }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FILE           => $fh,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT        => 180,
        CURLOPT_USERAGENT      => 'Mozilla/5.0 StartipOS-DriveVideo',
        CURLOPT_NOPROGRESS     => false,
        CURLOPT_PROGRESSFUNCTION => function ($ch, $total, $baixado) {
            return $baixado > MAX_BYTES ? 1 : 0; // aborta se passar do limite
        },
    ]);
    $ok   = curl_exec($ch);
    $http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $tipo = (string)curl_getinfo($ch, CURLINFO_CONTENT_TYPE);
    curl_close($ch);
    fclose($fh);
    $tam = @filesize($tmp);
    if ($ok === false || $http !== 200 || stripos($tipo, 'video/') !== 0 || !$tam || $tam < 1024) {
        @unlink($tmp);
        return false;
    }
    return @rename($tmp, $destino);
}

/** Último recurso: repassa direto do Drive (sem cópia). */
function proxy_direto(string $url): void {
    $status = 200;
    $repassar = ['content-type', 'content-length', 'content-range', 'accept-ranges'];
    $env = [];
    if (!empty($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=\d*-\d*$/', $_SERVER['HTTP_RANGE'])) {
        $env[] = 'Range: ' . $_SERVER['HTTP_RANGE'];
    }
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => $env, CURLOPT_FOLLOWLOCATION => true, CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_HEADERFUNCTION => function ($c, $l) use (&$status, $repassar) {
            $t = trim($l);
            if (stripos($t, 'HTTP/') === 0) { $status = (int)(explode(' ', $t)[1] ?? 200); return strlen($l); }
            $p = strpos($t, ':');
            if ($p !== false && in_array(strtolower(substr($t, 0, $p)), $repassar, true)) { header($t, true); }
            return strlen($l);
        },
        CURLOPT_WRITEFUNCTION => function ($c, $d) use (&$status) {
            static $ini = false;
            if (!$ini) { $ini = true; http_response_code($status === 206 ? 206 : 200); header('Content-Disposition: inline'); }
            echo $d; flush();
            return strlen($d);
        },
    ]);
    curl_exec($ch);
    curl_close($ch);
}

if (!is_file($arquivo) || filesize($arquivo) < 1024) {
    if (!baixar($origem, $arquivo)) {
        proxy_direto($origem);
        exit;
    }
}
@touch($arquivo);

// ---- Serve a cópia local com suporte a Range ----
$tamanho = filesize($arquivo);
$ini = 0;
$fim = $tamanho - 1;
$parcial = false;

if (!empty($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=(\d*)-(\d*)$/', $_SERVER['HTTP_RANGE'], $m)) {
    if ($m[1] === '' && $m[2] !== '') {            // últimos N bytes
        $ini = max(0, $tamanho - (int)$m[2]);
    } else {
        if ($m[1] !== '') { $ini = (int)$m[1]; }
        if ($m[2] !== '') { $fim = min((int)$m[2], $tamanho - 1); }
    }
    if ($ini > $fim || $ini >= $tamanho) {
        http_response_code(416);
        header('Content-Range: bytes */' . $tamanho);
        exit;
    }
    $parcial = true;
}

http_response_code($parcial ? 206 : 200);
header('Content-Type: video/mp4');
header('Accept-Ranges: bytes');
header('Content-Disposition: inline');
header('Cache-Control: private, max-age=3600');
header('X-Content-Type-Options: nosniff');
if ($parcial) { header("Content-Range: bytes $ini-$fim/$tamanho"); }
header('Content-Length: ' . ($fim - $ini + 1));

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'HEAD') { exit; }

$fh = fopen($arquivo, 'rb');
fseek($fh, $ini);
$restante = $fim - $ini + 1;
while ($restante > 0 && !feof($fh) && !connection_aborted()) {
    $bloco = fread($fh, min(262144, $restante));
    if ($bloco === false || $bloco === '') { break; }
    echo $bloco;
    flush();
    $restante -= strlen($bloco);
}
fclose($fh);
