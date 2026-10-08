/**
 * Backup de reuniões da Startip -> Google Drive.
 *
 * Roda dentro do Google (Apps Script), na conta que é DONA/EDITORA da pasta.
 * O Startip OS só conhece a URL deste web app e o TOKEN; nenhuma senha ou
 * credencial do Google sai daqui.
 *
 * Instalação: veja os passos que o Claude passou (script.google.com ->
 * Novo projeto -> colar este arquivo -> Propriedades do script: TOKEN ->
 * Implantar como Aplicativo da Web).
 */

// Pasta onde os backups caem (o trecho final do link da pasta).
const PASTA_RAIZ_ID = '1ZEjrKNGeAlJzRVOZN5qFc772IqYLCbcm';

function doPost(e) {
  try {
    const token = PropertiesService.getScriptProperties().getProperty('TOKEN');
    const body = JSON.parse(e.postData.contents);
    if (!token || body.token !== token) {
      return resposta({ ok: false, erro: 'Token inválido.' });
    }

    const raiz = DriveApp.getFolderById(PASTA_RAIZ_ID);
    const pasta = subpasta(raiz, nomeSeguro(body.cliente || 'Sem cliente'));
    const base = nomeSeguro(body.data + ' - ' + body.titulo);
    const arquivos = [];

    const texto = [
      'Cliente: ' + (body.cliente || ''),
      'Data da reunião: ' + body.data,
      'Título / assunto: ' + body.titulo,
      '',
      'RESUMO',
      '------',
      body.resumo || '(sem resumo)',
      '',
    ].join('\n');
    gravar(pasta, base + '.txt', function (nome) {
      return pasta.createFile(nome, texto, MimeType.PLAIN_TEXT);
    });
    arquivos.push(base + '.txt');

    if (body.pdfBase64) {
      const blob = Utilities.newBlob(Utilities.base64Decode(body.pdfBase64), 'application/pdf', base + '.pdf');
      gravar(pasta, base + '.pdf', function () {
        return pasta.createFile(blob);
      });
      arquivos.push(base + '.pdf');
    }

    return resposta({ ok: true, pastaUrl: pasta.getUrl(), arquivos: arquivos });
  } catch (err) {
    return resposta({ ok: false, erro: String(err) });
  }
}

// Abrir a URL no navegador só confirma que a implantação está de pé.
function doGet() {
  return resposta({ ok: true, mensagem: 'Backup de reuniões Startip ativo.' });
}

function subpasta(pai, nome) {
  const it = pai.getFoldersByName(nome);
  return it.hasNext() ? it.next() : pai.createFolder(nome);
}

// Reenviar a mesma reunião substitui o arquivo; o antigo vai para a lixeira
// do Drive (recuperável), nunca é apagado de vez.
function gravar(pasta, nome, criar) {
  const antigos = pasta.getFilesByName(nome);
  while (antigos.hasNext()) antigos.next().setTrashed(true);
  criar(nome);
}

function nomeSeguro(s) {
  return String(s).replace(/[\\/:*?"<>|\r\n]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 120) || 'sem-nome';
}

function resposta(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
