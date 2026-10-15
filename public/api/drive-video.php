<?php
// Proxy de vídeo do Google Drive para a aprovação do cliente.
// O link direto do Drive vem com "Content-Disposition: attachment", e o Safari/Chrome do
// iPhone não toca <video> assim. Aqui o vídeo sai do nosso domínio, inline e com Range.
// Só aceita IDs de arquivo do Drive; nada além de drive.usercontent.google.com é acessado.

$id = $_GET['id'] ?? '';
if (!preg_match('/^[A-Za-z0-9_-]{10,80}$/', $id)) {
    http_response_code(400);
    exit('id inválido');
}

@set_time_limit(0);
@ini_set('zlib.output_compression', '0');
while (ob_get_level() > 0) { ob_end_clean(); }

$url = 'https://drive.usercontent.google.com/download?id=' . $id . '&export=download&confirm=t';
$headersEnvio = [];
if (!empty($_SERVER['HTTP_RANGE']) && preg_match('/^bytes=\d*-\d*$/', $_SERVER['HTTP_RANGE'])) {
    $headersEnvio[] = 'Range: ' . $_SERVER['HTTP_RANGE'];
}

$status = 200;
$repassar = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified'];

$ch = curl_init($url);
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER     => $headersEnvio,
    CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_USERAGENT      => 'Mozilla/5.0 StartipOS-DriveVideo',
    CURLOPT_HEADERFUNCTION => function ($ch, $linha) use (&$status, $repassar) {
        $t = trim($linha);
        if (stripos($t, 'HTTP/') === 0) {
            $partes = explode(' ', $t);
            $status = (int)($partes[1] ?? 200);
            return strlen($linha);
        }
        $pos = strpos($t, ':');
        if ($pos === false) { return strlen($linha); }
        $nome = strtolower(substr($t, 0, $pos));
        if (in_array($nome, $repassar, true)) {
            header(substr($t, 0, $pos) . ':' . substr($t, $pos + 1), true);
        }
        return strlen($linha);
    },
    CURLOPT_WRITEFUNCTION  => function ($ch, $dados) use (&$status) {
        static $iniciou = false;
        if (!$iniciou) {
            $iniciou = true;
            http_response_code($status === 206 ? 206 : 200);
            header('Content-Disposition: inline');
            header('Cache-Control: private, max-age=3600');
            header('X-Content-Type-Options: nosniff');
        }
        echo $dados;
        flush();
        return strlen($dados);
    },
]);
$ok = curl_exec($ch);
$http = curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
curl_close($ch);

if ($ok === false && !headers_sent()) {
    http_response_code(502);
    exit('falha ao buscar o vídeo');
}
if ($http >= 400 && !headers_sent()) {
    http_response_code($http);
}
