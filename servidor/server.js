// Consultoria de musculação — servidor sem dependências externas (Node 22.13+ com node:sqlite)
// Guarda os dados num banco SQLite e serve o sistema (index.html + assets/).
// Dois tipos de acesso: o PROFESSOR (vê e altera tudo) e cada ALUNO (vê só o que é dele e
// registra os próprios treinos, check-ins, fotos e mensagens).
// Os dados ficam como "registros" (um por aluno, treino, execução...) para que o professor e os
// alunos usando ao mesmo tempo não apaguem o trabalho um do outro.
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

const PORT = Number(process.env.PORT) || 3300;
const HOST = process.env.HOST || undefined;
const TRUST_PROXY = process.env.TRUST_PROXY === '1';
const RAIZ = process.env.RAIZ || path.join(__dirname, '..');           // pasta com index.html e assets/
const DB_FILE = process.env.DB_FILE || path.join(__dirname, 'dados', 'consultoria.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_FILE), 'backups');
const BACKUP_DIAS = Number(process.env.BACKUP_DIAS) || 30;
const SESSAO_DIAS = 60;

fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
const db = new DatabaseSync(DB_FILE);
db.exec('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
db.exec(`
CREATE TABLE IF NOT EXISTS usuarios (
  id INTEGER PRIMARY KEY,
  nome TEXT NOT NULL,
  login TEXT NOT NULL UNIQUE COLLATE NOCASE,
  senha_hash TEXT NOT NULL,
  perfil TEXT NOT NULL DEFAULT 'aluno',
  aluno_id TEXT,
  ativo INTEGER NOT NULL DEFAULT 1,
  ultimo_acesso TEXT,
  criado_em TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS sessoes (
  token TEXT PRIMARY KEY,
  usuario_id INTEGER NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
  criado_em TEXT DEFAULT (datetime('now','localtime'))
);
CREATE TABLE IF NOT EXISTS registros (
  colecao TEXT NOT NULL,
  id TEXT NOT NULL,
  dados TEXT NOT NULL,
  versao INTEGER NOT NULL,
  apagado INTEGER NOT NULL DEFAULT 0,
  usuario_id INTEGER,
  atualizado_em TEXT DEFAULT (datetime('now','localtime')),
  PRIMARY KEY (colecao, id)
);
CREATE INDEX IF NOT EXISTS idx_registros_versao ON registros(versao);
`);

// ---------- utilidades ----------
class Erro extends Error { constructor(status, msg) { super(msg); this.status = status; } }
const p2 = (n) => String(n).padStart(2, '0');
const fmtData = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;

function hashSenha(senha) {
  const salt = crypto.randomBytes(16).toString('hex');
  return salt + ':' + crypto.scryptSync(senha, salt, 64).toString('hex');
}
function confereSenha(senha, guardado) {
  const [salt, hash] = String(guardado).split(':');
  if (!salt || !hash) return false;
  const a = Buffer.from(hash, 'hex');
  const b = crypto.scryptSync(String(senha), salt, 64);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function transacao(fn) {
  db.exec('BEGIN');
  try { const r = fn(); db.exec('COMMIT'); return r; } catch (e) { db.exec('ROLLBACK'); throw e; }
}
function validaSenha(s) {
  if (typeof s !== 'string' || s.length < 6) throw new Erro(400, 'A senha precisa ter pelo menos 6 caracteres');
  return s;
}

// primeiro acesso: cria o professor com a senha gerada pelo instalador
if (!db.prepare("SELECT COUNT(*) n FROM usuarios WHERE perfil = 'professor'").get().n) {
  const senha = process.env.ADMIN_SENHA_INICIAL || 'treino123';
  db.prepare('INSERT INTO usuarios (nome, login, senha_hash, perfil) VALUES (?, ?, ?, ?)')
    .run('Professor', 'professor', hashSenha(senha), 'professor');
  console.log('Usuário "professor" criado.' + (process.env.ADMIN_SENHA_INICIAL ? '' : ' Senha inicial: treino123 (troque no primeiro acesso)'));
}

// ---------- dados do sistema ----------
// códigos internos só com letras, números, _ e - (vão parar dentro de botões da tela)
const ID_OK = /^[A-Za-z0-9_-]{1,80}$/;
const COLECOES = ['alunos', 'exercicios', 'treinos', 'execucoes', 'avaliacoes', 'fotos', 'checkins', 'mensagens', 'pagamentos', 'config'];
// coleções em que cada registro pertence a um aluno (campo alunoId)
const DO_ALUNO = ['treinos', 'execucoes', 'avaliacoes', 'fotos', 'checkins', 'mensagens', 'pagamentos'];
// o que o aluno pode criar/alterar (sempre só os dele)
const ALUNO_GRAVA = ['execucoes', 'checkins', 'fotos', 'mensagens'];
const ehProf = (u) => u.perfil === 'professor';
const LIMITE = { fotos: 900000 };

function podeLer(u, c, d) {
  if (ehProf(u)) return true;
  if (c === 'exercicios' || c === 'config') return true;
  if (c === 'alunos') return d.id === u.alunoId;
  if (DO_ALUNO.includes(c)) return !!d.alunoId && d.alunoId === u.alunoId;
  return false;
}
// o aluno não vê as anotações particulares do professor
function filtrar(u, c, d) {
  if (ehProf(u)) return d;
  if (c === 'alunos') { const { notas, ...resto } = d; return resto; }
  if (c === 'config') return { id: d.id, nome: d.nome, professor: d.professor, whatsapp: d.whatsapp, pix: d.pix };
  if (c === 'treinos') { const { notas, ...resto } = d; return resto; }
  return d;
}
function podeGravar(u, c, atual, novo) {
  if (ehProf(u)) return true;
  if (!ALUNO_GRAVA.includes(c)) return false;
  if (atual && atual.alunoId !== u.alunoId) return false;
  if (novo && novo.alunoId !== u.alunoId) return false;
  if (c === 'mensagens') {
    if (!atual) return !!novo && novo.de === 'aluno';           // pode mandar mensagem
    if (!novo) return atual.de === 'aluno';                      // pode apagar a que mandou
    return true;                                                 // marcar como lida (completar() garante o resto)
  }
  return true;
}
// campos que só o professor preenche: o servidor mantém o que estava guardado
function completar(u, c, atual, d) {
  if (ehProf(u)) return d;
  if (c === 'mensagens' && atual) return { ...atual, lida: !!d.lida };
  if (c === 'execucoes' || c === 'checkins' || c === 'fotos') {
    const { resposta, respondidoEm, visto, ...resto } = d;
    return atual ? { ...resto, resposta: atual.resposta, respondidoEm: atual.respondidoEm, visto: atual.visto }
      : { ...resto, visto: false };
  }
  return d;
}

const versaoAtual = () => db.prepare('SELECT COALESCE(MAX(versao), 0) v FROM registros').get().v;

function estado(u, desde) {
  const linhas = db.prepare('SELECT colecao, id, dados, versao, apagado FROM registros WHERE versao > ? ORDER BY versao').all(desde);
  const itens = [];
  for (const l of linhas) {
    if (!COLECOES.includes(l.colecao)) continue;
    const d = JSON.parse(l.dados);
    if (!podeLer(u, l.colecao, d)) continue;
    if (l.apagado) { if (desde) itens.push({ c: l.colecao, id: l.id, apagado: 1 }); continue; }
    itens.push({ c: l.colecao, id: l.id, dados: filtrar(u, l.colecao, d) });
  }
  return { versao: versaoAtual(), itens };
}

function sincronizar(u, ops) {
  if (!Array.isArray(ops)) throw new Erro(400, 'Formato inválido');
  if (ops.length > 3000) throw new Erro(413, 'Alterações demais de uma vez');
  return transacao(() => {
    let v = versaoAtual();
    const ler = db.prepare('SELECT dados, apagado FROM registros WHERE colecao = ? AND id = ?');
    const gravar = db.prepare(`INSERT INTO registros (colecao, id, dados, versao, apagado, usuario_id, atualizado_em)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now','localtime'))
      ON CONFLICT(colecao, id) DO UPDATE SET dados = excluded.dados, versao = excluded.versao, apagado = excluded.apagado,
        usuario_id = excluded.usuario_id, atualizado_em = excluded.atualizado_em`);
    let recusados = 0;
    for (const op of ops) {
      const c = op && op.c, id = op && op.id;
      if (!COLECOES.includes(c) || typeof id !== 'string' || !ID_OK.test(id)) throw new Erro(400, 'Registro inválido');
      const linha = ler.get(c, id);
      const atual = linha && !linha.apagado ? JSON.parse(linha.dados) : null;
      // um código já usado por outro aluno (mesmo apagado) não pode ser reaproveitado pelo aluno
      if (!ehProf(u) && linha && linha.apagado && JSON.parse(linha.dados).alunoId !== u.alunoId) { recusados++; continue; }
      if (op.apagar) {
        if (!atual) continue;
        if (!podeGravar(u, c, atual, null)) { recusados++; continue; }
        gravar.run(c, id, linha.dados, ++v, 1, u.id);
        continue;
      }
      const d = op.dados;
      if (!d || typeof d !== 'object' || Array.isArray(d) || d.id !== id) throw new Erro(400, 'Registro inválido');
      if (DO_ALUNO.includes(c) && c !== 'treinos' && !(typeof d.alunoId === 'string' && ID_OK.test(d.alunoId))) throw new Erro(400, 'Registro inválido');
      if (!podeGravar(u, c, atual, d)) { recusados++; continue; }
      const json = JSON.stringify(completar(u, c, atual, d));
      if (json.length > (LIMITE[c] || 300000)) throw new Erro(413, 'Registro muito grande');
      gravar.run(c, id, json, ++v, 0, u.id);
    }
    return { versao: v, recusados };
  });
}

// ---------- rotas ----------
const rotas = [];
function rota(metodo, caminho, handler, { prof = false, publica = false } = {}) {
  const nomes = [];
  const re = new RegExp('^' + caminho.replace(/:(\w+)/g, (_, n) => { nomes.push(n); return '(\\d+)'; }) + '$');
  rotas.push({ metodo, re, nomes, handler, prof, publica });
}
const ipDe = (req) => (TRUST_PROXY && String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()) || req.socket.remoteAddress;
const ehHttps = (req) => TRUST_PROXY && req.headers['x-forwarded-proto'] === 'https';
const cookie = (req, valor, maxAge) =>
  `sid=${valor}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${ehHttps(req) ? '; Secure' : ''}`;

const MAX_FALHAS = 5, BLOQUEIO_MS = 15 * 60 * 1000;
const falhasLogin = new Map();
function conferirBloqueio(ip) {
  const f = falhasLogin.get(ip);
  if (f && f.n >= MAX_FALHAS && Date.now() - f.t < BLOQUEIO_MS) throw new Erro(429, 'Muitas tentativas. Aguarde 15 minutos e tente de novo.');
}
function registrarFalha(ip) {
  const f = falhasLogin.get(ip);
  const n = f && Date.now() - f.t < BLOQUEIO_MS ? f.n + 1 : 1;
  falhasLogin.set(ip, { n, t: Date.now() });
}
const publico = (u) => ({ id: u.id, nome: u.nome, login: u.login, perfil: u.perfil, alunoId: u.aluno_id ?? u.alunoId ?? null });
const marcarAcesso = (id) => db.prepare("UPDATE usuarios SET ultimo_acesso = datetime('now','localtime') WHERE id = ?").run(id);

rota('POST', '/api/login', ({ req, body, res }) => {
  const ip = ipDe(req);
  conferirBloqueio(ip);
  const u = db.prepare('SELECT * FROM usuarios WHERE login = ? AND ativo = 1').get(String(body.login || '').trim());
  if (!u || !confereSenha(body.senha || '', u.senha_hash)) { registrarFalha(ip); throw new Erro(401, 'Usuário ou senha incorretos'); }
  falhasLogin.delete(ip);
  const token = crypto.randomBytes(32).toString('hex');
  db.prepare('INSERT INTO sessoes (token, usuario_id) VALUES (?, ?)').run(token, u.id);
  marcarAcesso(u.id);
  res.setHeader('Set-Cookie', cookie(req, token, SESSAO_DIAS * 86400));
  return publico(u);
}, { publica: true });
rota('POST', '/api/logout', ({ req, token, res }) => {
  if (token) db.prepare('DELETE FROM sessoes WHERE token = ?').run(token);
  res.setHeader('Set-Cookie', cookie(req, '', 0));
}, { publica: true });
rota('GET', '/api/me', ({ user }) => { marcarAcesso(user.id); return publico(user); });
rota('POST', '/api/me/senha', ({ body, user }) => {
  const u = db.prepare('SELECT senha_hash FROM usuarios WHERE id = ?').get(user.id);
  if (!confereSenha(body.atual || '', u.senha_hash)) throw new Erro(400, 'A senha atual está incorreta');
  db.prepare('UPDATE usuarios SET senha_hash = ? WHERE id = ?').run(hashSenha(validaSenha(body.nova)), user.id);
});

// acessos dos alunos (só o professor)
rota('GET', '/api/acessos', () =>
  db.prepare("SELECT id, nome, login, aluno_id alunoId, ativo, ultimo_acesso ultimoAcesso FROM usuarios WHERE perfil = 'aluno' ORDER BY nome").all(), { prof: true });
rota('POST', '/api/acessos', ({ body }) => {
  const alunoId = String(body.alunoId || ''), nome = String(body.nome || '').trim() || 'Aluno';
  const login = String(body.login || '').trim().toLowerCase();
  if (!ID_OK.test(alunoId)) throw new Erro(400, 'Aluno inválido');
  if (!/^[a-z0-9._-]{3,30}$/.test(login)) throw new Erro(400, 'O usuário precisa ter de 3 a 30 letras ou números, sem espaço nem acento');
  const senha = validaSenha(body.senha);
  const outro = db.prepare('SELECT id, aluno_id FROM usuarios WHERE login = ?').get(login);
  const meu = db.prepare("SELECT id FROM usuarios WHERE perfil = 'aluno' AND aluno_id = ?").get(alunoId);
  if (outro && (!meu || outro.id !== meu.id)) throw new Erro(400, 'Esse usuário já está sendo usado. Escolha outro.');
  if (meu) {
    db.prepare('UPDATE usuarios SET nome = ?, login = ?, senha_hash = ?, ativo = 1 WHERE id = ?').run(nome, login, hashSenha(senha), meu.id);
    db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(meu.id);
    return { id: meu.id };
  }
  const r = db.prepare("INSERT INTO usuarios (nome, login, senha_hash, perfil, aluno_id) VALUES (?, ?, ?, 'aluno', ?)").run(nome, login, hashSenha(senha), alunoId);
  return { id: Number(r.lastInsertRowid) };
}, { prof: true });
rota('PUT', '/api/acessos/:id', ({ body, params }) => {
  const alvo = db.prepare("SELECT * FROM usuarios WHERE id = ? AND perfil = 'aluno'").get(params.id);
  if (!alvo) throw new Erro(404, 'Acesso não encontrado');
  const ativo = body.ativo ? 1 : 0;
  db.prepare('UPDATE usuarios SET ativo = ? WHERE id = ?').run(ativo, alvo.id);
  if (!ativo) db.prepare('DELETE FROM sessoes WHERE usuario_id = ?').run(alvo.id);
}, { prof: true });

rota('GET', '/api/estado', ({ user, query }) => estado(user, Math.max(0, Number(query.get('desde')) || 0)));
rota('POST', '/api/sync', ({ user, body }) => sincronizar(user, body.ops));

// ---------- servidor HTTP ----------
const TIPOS = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.json': 'application/json',
  '.webmanifest': 'application/manifest+json' };

function lerCorpo(req) {
  return new Promise((resolve, reject) => {
    let d = '';
    req.on('data', (c) => { d += c; if (d.length > 12e6) { reject(new Erro(413, 'Requisição muito grande')); req.destroy(); } });
    req.on('end', () => { try { resolve(d ? JSON.parse(d) : {}); } catch { reject(new Erro(400, 'JSON inválido')); } });
    req.on('error', reject);
  });
}
function lerToken(req) {
  const m = /(?:^|;\s*)sid=([a-f0-9]+)/.exec(req.headers.cookie || '');
  return m ? m[1] : null;
}
const CABECALHOS = { 'X-Content-Type-Options': 'nosniff', 'X-Frame-Options': 'DENY', 'Referrer-Policy': 'same-origin' };
function enviarJson(res, status, obj) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
// index.html é o mesmo da demonstração; aqui ele recebe a marca que liga o modo online
function paginaPrincipal() {
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  return html.replace('</head>', '<script>window.APP_ONLINE=1;</script>\n</head>');
}

const servidor = http.createServer(async (req, res) => {
  for (const [k, v] of Object.entries(CABECALHOS)) res.setHeader(k, v);
  const url = new URL(req.url, 'http://localhost');
  if (url.pathname.startsWith('/api/')) {
    try {
      const r = rotas.find((x) => x.metodo === req.method && x.re.test(url.pathname));
      if (!r) throw new Erro(404, 'Rota não encontrada');
      const m = r.re.exec(url.pathname);
      const params = Object.fromEntries(r.nomes.map((n, i) => [n, Number(m[i + 1])]));
      const token = lerToken(req);
      let user = null;
      if (token) {
        user = db.prepare(`SELECT u.id, u.nome, u.login, u.perfil, u.aluno_id alunoId FROM sessoes s JOIN usuarios u ON u.id = s.usuario_id
          WHERE s.token = ? AND u.ativo = 1 AND s.criado_em > datetime('now','localtime','-${SESSAO_DIAS} days')`).get(token) || null;
      }
      if (!r.publica && !user) throw new Erro(401, 'Faça login novamente');
      if (r.prof && !ehProf(user)) throw new Erro(403, 'Somente o professor');
      const body = ['POST', 'PUT'].includes(req.method) ? await lerCorpo(req) : {};
      const out = await r.handler({ req, res, body, params, query: url.searchParams, user, token });
      enviarJson(res, 200, out ?? { ok: true });
    } catch (e) {
      if (!e.status) console.error(e);
      enviarJson(res, e.status || 500, { erro: e.status ? e.message : 'Erro interno: ' + e.message });
    }
    return;
  }
  try {
    if (url.pathname.startsWith('/assets/')) {
      const arquivo = path.normalize(path.join(RAIZ, decodeURIComponent(url.pathname)));
      if (!arquivo.startsWith(path.join(RAIZ, 'assets') + path.sep) || !fs.existsSync(arquivo) || fs.statSync(arquivo).isDirectory()) { res.writeHead(404); return res.end(); }
      const ext = path.extname(arquivo);
      // código e estilo sempre conferidos (para a atualização chegar na hora); imagens ficam guardadas 1 dia
      const cache = ['.js', '.css', '.webmanifest'].includes(ext) ? 'no-cache' : 'public, max-age=86400';
      res.writeHead(200, { 'Content-Type': TIPOS[ext] || 'application/octet-stream', 'Cache-Control': cache });
      return fs.createReadStream(arquivo).pipe(res);
    }
    res.writeHead(200, { 'Content-Type': TIPOS['.html'], 'Cache-Control': 'no-cache' });
    res.end(paginaPrincipal());
  } catch (e) {
    console.error(e);
    res.writeHead(500); res.end('Erro interno');
  }
});

// ---------- backup automático ----------
// Uma cópia por dia em dados/backups (guarda os últimos BACKUP_DIAS dias).
function fazerBackup() {
  try {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    const destino = path.join(BACKUP_DIR, `consultoria-${fmtData(new Date())}.db`);
    if (!fs.existsSync(destino)) {
      db.exec(`VACUUM INTO '${destino.replace(/'/g, "''")}'`);
      console.log('Backup salvo:', destino);
    }
    const antigos = fs.readdirSync(BACKUP_DIR).filter((f) => /^consultoria-\d{4}-\d{2}-\d{2}\.db$/.test(f)).sort().reverse().slice(BACKUP_DIAS);
    for (const f of antigos) fs.unlinkSync(path.join(BACKUP_DIR, f));
    db.prepare(`DELETE FROM sessoes WHERE criado_em <= datetime('now','localtime','-${SESSAO_DIAS} days')`).run();
  } catch (e) {
    console.error('Falha no backup:', e.message);
  }
}
fazerBackup();
setInterval(fazerBackup, 3600e3).unref();

servidor.listen(PORT, HOST, () => {
  console.log(`\n  Consultoria rodando em: http://localhost:${PORT}\n`);
});
