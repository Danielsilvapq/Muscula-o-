// Consultoria de musculação — núcleo: dados, sincronização com o servidor, utilidades, janelas e gráficos.
// O mesmo arquivo roda nos dois modos: servido pelo servidor/ (window.APP_ONLINE) usa login real e
// dados no servidor; aberto direto no navegador vira a demonstração, com dados fictícios salvos só no navegador.
'use strict';
const ONLINE = !!window.APP_ONLINE;
const COLS = ['alunos', 'exercicios', 'treinos', 'execucoes', 'avaliacoes', 'fotos', 'checkins', 'mensagens', 'pagamentos', 'config'];

// ---------- utilidades ----------
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);
const uid = (p = '') => p + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const p2 = (n) => String(n).padStart(2, '0');
const fmtData = (d) => `${d.getFullYear()}-${p2(d.getMonth() + 1)}-${p2(d.getDate())}`;
const hoje = () => fmtData(new Date());
const paraData = (s) => { const [a, m, d] = String(s).split('-').map(Number); return new Date(a, (m || 1) - 1, d || 1); };
const addDias = (s, n) => { const d = paraData(s); d.setDate(d.getDate() + n); return fmtData(d); };
const diasEntre = (a, b) => Math.round((paraData(b) - paraData(a)) / 864e5);
const dataBR = (s) => { if (!s) return '—'; const [a, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}/${a}`; };
const dataCurta = (s) => { if (!s) return '—'; const [, m, d] = s.slice(0, 10).split('-'); return `${d}/${m}`; };
const SEMANA = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
const MESES = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];
const mesNome = (comp) => { const [a, m] = comp.split('-').map(Number); return MESES[m - 1] + ' de ' + a; };
const brl = (n) => (Number(n) || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const num = (n, dec = 1) => (n == null || n === '' || isNaN(n)) ? '—' : Number(n).toLocaleString('pt-BR', { maximumFractionDigits: dec });
const lerNum = (v) => { if (v == null || v === '') return null; const n = Number(String(v).replace(',', '.')); return isNaN(n) ? null : n; };
const horaDe = (iso) => { const d = new Date(iso); return `${p2(d.getHours())}:${p2(d.getMinutes())}`; };
function relDias(s) {
  if (!s) return 'nunca';
  const n = diasEntre(s.slice(0, 10), hoje());
  if (n <= 0) return 'hoje'; if (n === 1) return 'ontem'; if (n < 30) return `há ${n} dias`;
  const m = Math.round(n / 30); return m <= 1 ? 'há 1 mês' : `há ${m} meses`;
}
const iniciais = (nome) => String(nome || '?').trim().split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase();
const primeiroNome = (nome) => String(nome || '').trim().split(/\s+/).filter((p) => !/^(prof\.?|professora?|personal|dr\.?|dra\.?)$/i.test(p))[0] || String(nome || '').trim();
function semanaDe(s) { const d = paraData(s); const dow = (d.getDay() + 6) % 7; d.setDate(d.getDate() - dow); return fmtData(d); } // segunda-feira
function waLink(fone, texto) {
  let n = String(fone || '').replace(/\D/g, '');
  if (n && n.length <= 11) n = '55' + n;
  return 'https://wa.me/' + n + (texto ? '?text=' + encodeURIComponent(texto) : '');
}
function videoLink(ex) { return ex && ex.video ? ex.video : 'https://www.youtube.com/results?search_query=' + encodeURIComponent((ex ? ex.nome : '') + ' execução correta'); }
function lerImagem(arquivo, max = 1100) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(arquivo), img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      URL.revokeObjectURL(url);
      let q = 0.82, out = c.toDataURL('image/jpeg', q);
      while (out.length > 850000 && q > 0.4) { q -= 0.1; out = c.toDataURL('image/jpeg', q); }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Não consegui abrir essa imagem')); };
    img.src = url;
  });
}
function lerSegundos(t) { // "90s", "1:30", "2 min", "60" -> segundos
  const s = String(t || '').trim().toLowerCase(); if (!s) return 0;
  let m = /^(\d+):(\d{1,2})$/.exec(s); if (m) return +m[1] * 60 + +m[2];
  m = /^(\d+(?:[.,]\d+)?)\s*(min|m|')/.exec(s); if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 60);
  m = /^(\d+)/.exec(s); return m ? +m[1] : 0;
}

// ---------- estado ----------
let S = vazio(), U = null;
function vazio() { const o = {}; COLS.forEach((c) => (o[c] = [])); return o; }
const CFG_PADRAO = { id: 'geral', nome: 'Consultoria Fitness', professor: 'Professor', whatsapp: '', pix: '', diasSemTreino: 5, diasCheckin: 7 };
const cfg = () => ({ ...CFG_PADRAO, ...(S.config.find((c) => c.id === 'geral') || {}) });
const alunoPor = (id) => S.alunos.find((a) => a.id === id);
const exPor = (id) => S.exercicios.find((e) => e.id === id);
const ehProf = () => U && U.perfil === 'professor';

const porData = (a, b) => (b.data || '').localeCompare(a.data || '') || (b.fim || b.em || '').localeCompare(a.fim || a.em || '');
const execsDo = (alunoId) => S.execucoes.filter((e) => e.alunoId === alunoId).sort(porData);
const checkinsDo = (alunoId) => S.checkins.filter((e) => e.alunoId === alunoId).sort(porData);
const avalsDo = (alunoId) => S.avaliacoes.filter((e) => e.alunoId === alunoId).sort(porData);
const fotosDo = (alunoId) => S.fotos.filter((e) => e.alunoId === alunoId).sort(porData);
const msgsDo = (alunoId) => S.mensagens.filter((m) => m.alunoId === alunoId).sort((a, b) => a.em.localeCompare(b.em));
const pagsDo = (alunoId) => S.pagamentos.filter((p) => p.alunoId === alunoId).sort((a, b) => b.comp.localeCompare(a.comp));
const treinosDo = (alunoId) => S.treinos.filter((t) => t.alunoId === alunoId).sort((a, b) => (b.ativo - a.ativo) || (b.inicio || '').localeCompare(a.inicio || ''));
const treinoAtivo = (alunoId) => treinosDo(alunoId).find((t) => t.ativo);
const ultimoTreino = (alunoId) => { const e = execsDo(alunoId)[0]; return e ? e.data : null; };
function treinosNoPeriodo(alunoId, dias) { const ini = addDias(hoje(), -dias + 1); return S.execucoes.filter((e) => e.alunoId === alunoId && e.data >= ini).length; }

// histórico de um exercício: melhor carga e volume (carga × repetições) em cada treino
function historicoEx(alunoId, exId) {
  const out = [];
  for (const e of [...execsDo(alunoId)].reverse()) {
    const it = (e.itens || []).find((x) => x.exId === exId); if (!it) continue;
    const feitas = (it.series || []).filter((s) => s.ok);
    if (!feitas.length) continue;
    let max = 0, vol = 0, reps = 0;
    for (const s of feitas) { const c = lerNum(s.carga) || 0, r = lerNum(s.reps) || 0; if (c > max) { max = c; reps = r; } vol += c * r; }
    out.push({ data: e.data, max, vol, reps, series: feitas.length });
  }
  return out;
}
function exerciciosFeitos(alunoId) {
  const n = {};
  for (const e of S.execucoes) if (e.alunoId === alunoId) for (const it of e.itens || []) if ((it.series || []).some((s) => s.ok && lerNum(s.carga))) n[it.exId] = (n[it.exId] || 0) + 1;
  return Object.entries(n).sort((a, b) => b[1] - a[1]).map(([id]) => id).filter((id) => exPor(id));
}
function pesosDo(alunoId) {
  const m = {};
  for (const c of S.checkins) if (c.alunoId === alunoId && lerNum(c.peso)) m[c.data] = lerNum(c.peso);
  for (const a of S.avaliacoes) if (a.alunoId === alunoId && lerNum(a.peso)) m[a.data] = lerNum(a.peso);
  return Object.entries(m).sort().map(([data, v]) => ({ data, v }));
}
function frequenciaSemanal(alunoId, n = 8) {
  const seg = semanaDe(hoje()), out = [];
  for (let i = n - 1; i >= 0; i--) { const ini = addDias(seg, -7 * i), fim = addDias(ini, 6); out.push({ data: ini, v: S.execucoes.filter((e) => e.alunoId === alunoId && e.data >= ini && e.data <= fim).length }); }
  return out;
}
function idade(nasc) { if (!nasc) return null; const n = paraData(nasc), h = new Date(); let a = h.getFullYear() - n.getFullYear(); if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) a--; return a; }

// ---------- guardar (demonstração) e sincronizar (online) ----------
const KEY = 'consultoria-demo-v1';
function salvar() { if (ONLINE) { enviar(); return; } try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { toast('O navegador não deixou salvar (memória cheia?)'); } }
function carregarDemo() {
  try { const j = localStorage.getItem(KEY); if (j) { const d = JSON.parse(j); if (d && d.alunos) { COLS.forEach((c) => (d[c] = d[c] || [])); return d; } } } catch (e) {}
  return seedDemo();
}
// Cada aluno, treino, execução etc. é um registro no servidor. A tela guarda a última versão recebida
// de cada um (BASE) e envia só o que mudou; a cada 15 s busca o que o outro lado alterou.
let BASE = {}, VER = 0, syncing = false, pendente = false, carregado = false, atrasoRender = false;
async function api(m, url, body) {
  const r = await fetch(url, { method: m, headers: body ? { 'Content-Type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined, credentials: 'same-origin' });
  let j = {}; try { j = await r.json(); } catch (e) {}
  if (r.status === 401 && url !== '/api/login' && url !== '/api/me') { U = null; carregado = false; fecharModal(); render(); throw new Error(j.erro || 'Faça login novamente'); }
  if (!r.ok) throw new Error(j.erro || 'Erro ' + r.status);
  return j;
}
function rede(ok) {
  let n = $('#rede'); if (!n) { n = document.createElement('div'); n.id = 'rede'; n.className = 'rede'; n.setAttribute('role', 'status'); document.body.appendChild(n); }
  n.textContent = 'Sem conexão com o servidor. O que você fizer será enviado quando a internet voltar.'; n.hidden = ok;
}
function aplicar(itens) {
  let mud = false;
  for (const it of itens) {
    const arr = S[it.c]; if (!arr) continue; const b = BASE[it.c] || (BASE[it.c] = {});
    const i = arr.findIndex((x) => x.id === it.id), local = i >= 0 ? JSON.stringify(arr[i]) : null, sujo = local !== (b[it.id] ?? null);
    if (it.apagado) delete b[it.id]; else b[it.id] = JSON.stringify(it.dados);
    if (sujo) continue; // alteração local ainda não enviada: ela vale
    if (it.apagado) { if (i >= 0) { arr.splice(i, 1); mud = true; } }
    else if (i >= 0) { if (local !== b[it.id]) { arr[i] = it.dados; mud = true; } } else { arr.push(it.dados); mud = true; }
  }
  return mud;
}
function mudancas() {
  const o = [];
  for (const c of COLS) {
    const b = BASE[c] || (BASE[c] = {}), vistos = new Set();
    for (const x of S[c] || []) { vistos.add(x.id); const js = JSON.stringify(x); if (b[x.id] !== js) o.push({ c, id: x.id, dados: x, js }); }
    for (const id in b) if (!vistos.has(id)) o.push({ c, id, apagar: true });
  }
  return o;
}
async function enviar() {
  if (!ONLINE || !U || !carregado) return; if (syncing) { pendente = true; return; }
  const o = mudancas(); if (!o.length) return; syncing = true;
  try {
    const r = await api('POST', '/api/sync', { ops: o.map(({ js, ...x }) => x) });
    for (const x of o) { if (x.apagar) delete BASE[x.c][x.id]; else BASE[x.c][x.id] = x.js; }
    rede(true);
    if (r.recusados) { toast('Algumas alterações não foram salvas porque o seu acesso não permite.'); syncing = false; return carregar(); }
    await puxar();
  } catch (e) { rede(false); if (/grande/.test(e.message)) toast(e.message); }
  finally { syncing = false; if (pendente) { pendente = false; enviar(); } }
}
function podeRender() { const a = document.activeElement; return $('#modal').hidden && !EM_EDICAO() && !(a && /^(INPUT|SELECT|TEXTAREA)$/.test(a.tagName) && a.closest('#app')); }
let EM_EDICAO = () => false; // telas com formulário longo (editor de treino, treino em andamento) não são redesenhadas
async function puxar() {
  if (!ONLINE || !U || !carregado) return;
  try {
    const r = await api('GET', '/api/estado?desde=' + VER); VER = r.versao; rede(true);
    if (aplicar(r.itens)) { if (podeRender()) render(); else atrasoRender = true; }
    if (mudancas().length) enviar();
  } catch (e) { if (U) rede(false); }
}
async function carregar() {
  S = vazio(); BASE = {}; COLS.forEach((c) => (BASE[c] = {})); VER = 0; carregado = false;
  const r = await api('GET', '/api/estado?desde=0'); VER = r.versao; aplicar(r.itens); carregado = true;
  if (ehProf()) prepararProfessor();
  render(); enviar();
}
setInterval(() => { if (document.visibilityState === 'visible') puxar(); }, 15000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') puxar(); });
document.addEventListener('focusout', () => setTimeout(() => { if (atrasoRender && podeRender()) { atrasoRender = false; render(); } }, 50));

// primeira vez do professor: biblioteca de exercícios e configuração
function prepararProfessor() {
  if (!S.exercicios.length) S.exercicios = exerciciosIniciais();
  if (!S.config.find((c) => c.id === 'geral')) S.config.push({ ...CFG_PADRAO });
  gerarMensalidades();
  salvar();
}
// cria a mensalidade do mês para quem tem plano com valor (a do mês seguinte aparece 5 dias antes)
function gerarMensalidades() {
  const h = hoje(), meses = [h.slice(0, 7)];
  const prox = addDias(h, 5).slice(0, 7); if (prox !== meses[0]) meses.push(prox);
  for (const a of S.alunos) {
    if (a.status !== 'Ativo' || !(Number(a.valor) > 0)) continue;
    for (const comp of meses) {
      if (a.inicio && a.inicio.slice(0, 7) > comp) continue;
      if (S.pagamentos.some((p) => p.alunoId === a.id && p.comp === comp)) continue;
      const dia = Math.min(Math.max(1, Number(a.diaVenc) || 10), 28);
      S.pagamentos.push({ id: 'pg-' + a.id + '-' + comp, alunoId: a.id, comp, venc: comp + '-' + p2(dia), valor: Number(a.valor), pago: false, dataPag: null, forma: '' });
    }
  }
}

// ---------- login ----------
function telaLogin() {
  const c = cfg();
  if (ONLINE) return `<div class="login"><form class="card" onsubmit="entrarOnline(event)">
    <div class="logo">${esc(iniciais(c.nome) || 'CF')}</div>
    <h1>${esc(c.nome === CFG_PADRAO.nome ? 'Consultoria' : c.nome)}</h1><p class="muted" style="margin:4px 0 18px">Entre com o usuário e a senha que você recebeu.</p>
    <div class="stack"><label class="f"><span>Usuário</span><input class="i" id="lg_u" autocomplete="username" autocapitalize="none" required></label>
    <label class="f"><span>Senha</span><input class="i" id="lg_s" type="password" autocomplete="current-password" required></label>
    <p class="err" id="lg_err" hidden></p><button class="btn pri block" type="submit">Entrar</button></div></form></div>`;
  const al = S.alunos.filter((a) => a.status === 'Ativo').slice(0, 4);
  return `<div class="login"><div class="card">
    <div class="logo">CF</div><h1>Demonstração</h1>
    <p class="muted" style="margin:4px 0 18px">Dados fictícios, salvos só neste navegador. Escolha como quer ver o sistema:</p>
    <div class="stack"><button class="btn pri block" onclick="entrarDemo('professor')">Entrar como professor</button>
    <p class="small muted" style="margin:14px 0 0">Ou veja o app de um aluno (no celular):</p>
    ${al.map((a) => `<button class="btn block" onclick="entrarDemo('aluno','${a.id}')">${esc(a.nome)}</button>`).join('')}
    <button class="btn ghost block small" onclick="reiniciarDemo()">Recomeçar a demonstração do zero</button></div></div></div>`;
}
async function entrarOnline(e) {
  e.preventDefault(); const er = $('#lg_err'), bt = e.target.querySelector('button[type=submit]'); er.hidden = true; bt.disabled = true;
  try { U = await api('POST', '/api/login', { login: $('#lg_u').value.trim(), senha: $('#lg_s').value }); VIEW = { v: 'inicio' }; await carregar(); }
  catch (x) { er.textContent = x.message; er.hidden = false; bt.disabled = false; }
}
function entrarDemo(perfil, alunoId) {
  U = perfil === 'professor' ? { nome: cfg().professor, perfil } : { nome: alunoPor(alunoId).nome, perfil, alunoId };
  VIEW = { v: 'inicio' }; if (perfil === 'professor') prepararProfessor();
  try { sessionStorage.setItem(KEY + '-u', JSON.stringify(U)); } catch (e) {}
  render(); scrollTo(0, 0);
}
function reiniciarDemo() { confirmar('Apagar tudo o que foi feito na demonstração e começar de novo com os dados de exemplo?', () => { try { localStorage.removeItem(KEY); } catch (e) {} S = seedDemo(); salvar(); render(); }, 'Recomeçar'); }
async function sair() {
  if (ONLINE) { try { await api('POST', '/api/logout'); } catch (e) {} S = vazio(); BASE = {}; carregado = false; }
  try { sessionStorage.removeItem(KEY + '-u'); } catch (e) {}
  U = null; render();
}
function trocarSenha() {
  if (!ONLINE) return toast('Na demonstração não há senha.');
  abrirModal('Trocar minha senha', `<div class="stack">
    <label class="f"><span>Senha atual</span><input class="i" name="atual" type="password" autocomplete="current-password" required></label>
    <label class="f"><span>Nova senha (mínimo 6 caracteres)</span><input class="i" name="nova" type="password" minlength="6" autocomplete="new-password" required></label></div>`,
  async (d) => { await api('POST', '/api/me/senha', d); toast('Senha alterada'); }, 'Trocar senha');
}

// ---------- janelas (modal) e avisos ----------
let MODAL_OK = null;
function abrirModal(titulo, corpo, onOk, botao = 'Salvar', { lg = false, extra = '' } = {}) {
  const m = $('#modal');
  m.innerHTML = `<form class="modal${lg ? ' lg' : ''}" id="mform" novalidate>
    <div class="modal-h"><h2>${esc(titulo)}</h2><button type="button" class="icon-btn" onclick="fecharModal()" aria-label="Fechar">✕</button></div>
    <div id="mcorpo">${corpo}</div><p class="err" id="merr" hidden></p>
    <div class="modal-f">${extra}<button type="button" class="btn" onclick="fecharModal()">${onOk ? 'Cancelar' : 'Fechar'}</button>${onOk ? `<button class="btn pri" type="submit">${esc(botao)}</button>` : ''}</div></form>`;
  m.hidden = false; MODAL_OK = onOk; document.body.style.overflow = 'hidden';
  const f = $('#mform');
  f.onsubmit = async (e) => {
    e.preventDefault(); if (!MODAL_OK) return;
    if (!f.checkValidity()) { const inv = f.querySelector(':invalid'); erroModal(inv && inv.validationMessage ? (inv.closest('label')?.querySelector('span')?.textContent || 'Campo') + ': ' + inv.validationMessage : 'Confira os campos'); inv && inv.focus(); return; }
    const bt = f.querySelector('button[type=submit]'); bt.disabled = true;
    try { const r = await MODAL_OK(dadosForm(f), f); if (r !== false) { fecharModal(); render(); } }
    catch (x) { erroModal(x.message); }
    finally { bt.disabled = false; }
  };
  const pri = f.querySelector('input:not([type=hidden]),select,textarea');
  if (pri && matchMedia('(pointer:fine)').matches) pri.focus();
}
// confirmação dentro da própria página (o confirm() do navegador nem sempre aparece, ex.: dentro de apps)
function confirmar(msg, fazer, botao = 'Confirmar') {
  let c = $('#confirma'); if (c) c.remove();
  document.body.insertAdjacentHTML('beforeend', `<div id="confirma" class="modal-bg" style="z-index:70" role="dialog" aria-modal="true"><div class="modal" style="max-width:420px">
    <p style="margin:0;white-space:pre-line;font-size:15.5px">${esc(msg)}</p><div class="modal-f"><button type="button" class="btn" id="cf_nao">Cancelar</button><button type="button" class="btn pri" id="cf_sim">${esc(botao)}</button></div></div></div>`);
  c = $('#confirma');
  const fechar = () => c.remove();
  $('#cf_nao').onclick = fechar; c.onclick = (e) => { if (e.target === c) fechar(); };
  $('#cf_sim').onclick = () => { fechar(); fazer(); };
  $('#cf_sim').focus();
}
function fecharModal() { const m = $('#modal'); if (!m) return; m.hidden = true; m.innerHTML = ''; MODAL_OK = null; document.body.style.overflow = ''; if (atrasoRender && podeRender()) { atrasoRender = false; render(); } }
function erroModal(msg) { const e = $('#merr'); if (e) { e.textContent = msg; e.hidden = false; } }
function dadosForm(f) {
  const o = {};
  for (const el of f.elements) {
    if (!el.name) continue;
    if (el.type === 'checkbox') o[el.name] = el.checked;
    else if (el.type === 'radio') { if (el.checked) o[el.name] = el.value; }
    else o[el.name] = el.value.trim();
  }
  return o;
}
let toastT;
function toast(msg) { let t = $('#toast'); if (!t) { t = document.createElement('div'); t.id = 'toast'; t.className = 'toast'; t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => (t.hidden = true), 3000); }
document.addEventListener('keydown', (e) => { if (e.key !== 'Escape') return; if ($('#confirma')) $('#confirma').remove(); else if (!$('#modal').hidden) fecharModal(); });
const campo = (rot, nome, val = '', tipo = 'text', extra = '') => `<label class="f"><span>${rot}</span><input class="i" name="${nome}" type="${tipo}" value="${esc(val)}" ${extra}></label>`;
const selCampo = (rot, nome, opcoes, val, extra = '') => `<label class="f"><span>${rot}</span><select class="i" name="${nome}" ${extra}>${opcoes.map((o) => { const [v, t] = Array.isArray(o) ? o : [o, o]; return `<option value="${esc(v)}"${String(v) === String(val ?? '') ? ' selected' : ''}>${esc(t)}</option>`; }).join('')}</select></label>`;
const areaCampo = (rot, nome, val = '', extra = '') => `<label class="f"><span>${rot}</span><textarea class="i" name="${nome}" ${extra}>${esc(val)}</textarea></label>`;
function escala(nome, val, max = 5, rotulos) {
  return `<div class="escala" data-escala="${nome}">${Array.from({ length: max }, (_, i) => i + 1).map((n) => `<button type="button" class="${+val === n ? 'on' : ''}" onclick="marcarEscala(this,${n})" title="${rotulos ? esc(rotulos[n - 1]) : n}">${n}</button>`).join('')}<input type="hidden" name="${nome}" value="${esc(val ?? '')}"></div>`;
}
function marcarEscala(b, n) { const w = b.closest('.escala'); $$('button', w).forEach((x) => x.classList.toggle('on', x === b)); $('input', w).value = n; }
function verFoto(id) {
  const f = S.fotos.find((x) => x.id === id); if (!f) return;
  abrirModal(`${f.pose || 'Foto'} — ${dataBR(f.data)}`, `<img src="${f.img}" alt="Foto de ${esc(f.pose || 'evolução')}" style="width:100%;border-radius:12px">${f.obs ? `<p>${esc(f.obs)}</p>` : ''}`, null, '', { lg: true });
}

// ---------- gráficos (SVG desenhado aqui mesmo, sem bibliotecas) ----------
const CHARTS = {};
let chartN = 0;
// pts: [{data:'AAAA-MM-DD', v:número}] — tipo 'linha' (evolução no tempo) ou 'barras' (contagem por semana)
function grafico(pts, { tipo = 'linha', unid = '', dec = 1, titulo = '', rotX } = {}) {
  const id = 'g' + ++chartN; CHARTS[id] = { pts, tipo, unid, dec, rotX };
  if (!pts.length) return `<p class="vazio small">Ainda não há dados para este gráfico.</p>`;
  const tab = `<details class="tiny muted" style="margin-top:6px"><summary>Ver em tabela</summary><table><tbody>${pts.map((p) => `<tr><td>${dataBR(p.data)}</td><td class="r">${num(p.v, dec)} ${esc(unid)}</td></tr>`).join('')}</tbody></table></details>`;
  return `<div class="chart" data-chart="${id}" role="img" aria-label="${esc(titulo)}"></div>${tab}`;
}
function escalaBonita(min, max, n = 4) {
  if (min === max) { const d = Math.abs(min) * 0.1 || 1; min -= d; max += d; }
  const passo0 = (max - min) / n, mag = Math.pow(10, Math.floor(Math.log10(passo0))), r = passo0 / mag;
  const passo = (r <= 1 ? 1 : r <= 2 ? 2 : r <= 2.5 ? 2.5 : r <= 5 ? 5 : 10) * mag;
  return { lo: Math.floor(min / passo) * passo, hi: Math.ceil(max / passo) * passo, passo };
}
function desenharGraficos() {
  for (const el of $$('.chart[data-chart]')) {
    const g = CHARTS[el.dataset.chart]; if (!g) continue;
    const W = Math.max(240, el.clientWidth), H = 190, L = 44, R = 18, T = 16, B = 26, pw = W - L - R, ph = H - T - B;
    const pts = g.pts, vs = pts.map((p) => p.v);
    let { lo, hi, passo } = g.tipo === 'barras' ? escalaBonita(0, Math.max(...vs, 3)) : escalaBonita(Math.min(...vs), Math.max(...vs));
    if (g.tipo === 'barras') lo = 0;
    const y = (v) => T + ph - ((v - lo) / (hi - lo || 1)) * ph;
    let xs;
    if (g.tipo === 'barras') { const bw = pw / pts.length; xs = pts.map((_, i) => L + bw * i + bw / 2); }
    else if (pts.length === 1) xs = [L + pw / 2];
    else { const t0 = paraData(pts[0].data).getTime(), t1 = paraData(pts[pts.length - 1].data).getTime(); xs = pts.map((p) => L + ((paraData(p.data).getTime() - t0) / (t1 - t0 || 1)) * pw); }
    let s = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">`;
    for (let v = lo; v <= hi + passo / 2; v += passo) s += `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="ax" x="${L - 8}" y="${y(v) + 4}" text-anchor="end">${num(v, passo < 1 ? 1 : 0)}</text>`;
    const rot = g.rotX || dataCurta;
    const idxX = g.tipo === 'barras' ? pts.map((_, i) => i).filter((i) => pts.length <= 8 || i % 2 === pts.length % 2 || i === pts.length - 1) : [...new Set([0, Math.floor((pts.length - 1) / 2), pts.length - 1])];
    for (const i of idxX) s += `<text class="ax" x="${xs[i]}" y="${H - 6}" text-anchor="${g.tipo === 'barras' || pts.length === 1 ? 'middle' : i === 0 ? 'start' : i === pts.length - 1 ? 'end' : 'middle'}">${esc(rot(pts[i].data))}</text>`;
    if (g.tipo === 'barras') {
      const bw = Math.min(36, (pw / pts.length) - 6);
      pts.forEach((p, i) => { const h = Math.max(p.v ? 0 : 2, y(lo) - y(p.v)); const x = xs[i] - bw / 2, yy = y(lo) - h, r = Math.min(4, h / 2, bw / 2);
        s += p.v ? `<path class="br" d="M${x},${y(lo)} V${yy + r} Q${x},${yy} ${x + r},${yy} H${x + bw - r} Q${x + bw},${yy} ${x + bw},${yy + r} V${y(lo)} Z"/>` : `<rect class="br zero" x="${x}" y="${y(lo) - 2}" width="${bw}" height="2"/>`; });
    } else {
      const d = pts.map((p, i) => (i ? 'L' : 'M') + xs[i].toFixed(1) + ',' + y(p.v).toFixed(1)).join(' ');
      if (pts.length > 1) s += `<path class="ar" d="${d} L${xs[xs.length - 1]},${y(lo)} L${xs[0]},${y(lo)} Z"/><path class="ln" d="${d}"/>`;
      if (pts.length <= 40) pts.forEach((p, i) => (s += `<circle class="pt" cx="${xs[i]}" cy="${y(p.v)}" r="4"/>`));
      const u = pts.length - 1;
      s += `<text class="lbl-last" x="${xs[u]}" y="${y(pts[u].v) - 10}" text-anchor="${pts.length === 1 ? 'middle' : 'end'}">${num(pts[u].v, g.dec)}${g.unid ? ' ' + esc(g.unid) : ''}</text>`;
    }
    s += `<line class="xh" id="${el.dataset.chart}-xh" y1="${T}" y2="${T + ph}" x1="0" x2="0" visibility="hidden"/>`;
    s += `<rect x="${L}" y="0" width="${pw}" height="${H}" fill="transparent"/></svg><div class="tip" hidden></div>`;
    el.innerHTML = s;
    const tip = $('.tip', el), xh = $('line.xh', el);
    const mover = (ev) => {
      const box = el.getBoundingClientRect(), cx = (ev.touches ? ev.touches[0].clientX : ev.clientX) - box.left;
      let k = 0; xs.forEach((x, i) => { if (Math.abs(x - cx) < Math.abs(xs[k] - cx)) k = i; });
      const p = pts[k];
      tip.innerHTML = `<b>${num(p.v, g.dec)}${g.unid ? ' ' + esc(g.unid) : ''}</b>${g.tipo === 'barras' ? 'semana de ' + dataCurta(p.data) : dataBR(p.data)}${p.extra ? '<br>' + esc(p.extra) : ''}`;
      tip.hidden = false; tip.style.left = Math.min(Math.max(xs[k], 60), W - 60) + 'px'; tip.style.top = (g.tipo === 'barras' ? Math.min(y(p.v), y(lo) - 10) : y(p.v)) + 'px';
      xh.setAttribute('x1', xs[k]); xh.setAttribute('x2', xs[k]); xh.setAttribute('visibility', 'visible');
    };
    const sairG = () => { tip.hidden = true; xh.setAttribute('visibility', 'hidden'); };
    el.onmousemove = mover; el.onmouseleave = sairG; el.ontouchstart = mover; el.ontouchmove = mover; el.ontouchend = () => setTimeout(sairG, 1500);
  }
}
let rsT; addEventListener('resize', () => { clearTimeout(rsT); rsT = setTimeout(desenharGraficos, 150); });

// ---------- conversa (usada pelo professor e pelo aluno) ----------
function chatHTML(alunoId) {
  const eu = ehProf() ? 'prof' : 'aluno', ms = msgsDo(alunoId);
  let ult = '';
  const linhas = ms.map((m) => {
    const dia = m.em.slice(0, 10), sep = dia !== ult ? `<div class="tiny muted" style="text-align:center;margin:6px 0">${dia === hoje() ? 'Hoje' : dataBR(dia)}</div>` : ''; ult = dia;
    return sep + `<div class="msg ${m.de === eu ? 'eu' : 'ele'}">${esc(m.texto)}<div class="h">${horaDe(m.em)}${m.de === eu && m.lida ? ' · lida' : ''}</div></div>`;
  }).join('');
  return `<div class="chat" id="chat">${linhas || '<p class="vazio small">Nenhuma mensagem ainda.</p>'}</div>
    <form class="chat-in" onsubmit="enviarMsg(event,'${alunoId}')"><textarea class="i" id="msg_txt" placeholder="Escreva uma mensagem…" rows="1" onkeydown="if(event.key==='Enter'&&!event.shiftKey&&matchMedia('(pointer:fine)').matches){event.preventDefault();this.form.requestSubmit()}"></textarea><button class="btn pri">Enviar</button></form>`;
}
function marcarLidas(alunoId) {
  const outro = ehProf() ? 'aluno' : 'prof'; let mud = false;
  for (const m of S.mensagens) if (m.alunoId === alunoId && m.de === outro && !m.lida) { m.lida = true; mud = true; }
  if (mud) salvar();
}
function enviarMsg(e, alunoId) {
  e.preventDefault(); const t = $('#msg_txt'), texto = t.value.trim(); if (!texto) return;
  S.mensagens.push({ id: uid('m'), alunoId, de: ehProf() ? 'prof' : 'aluno', texto: texto.slice(0, 4000), em: new Date().toISOString(), lida: false });
  salvar(); t.value = ''; render(); setTimeout(() => { const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; const n = $('#msg_txt'); if (n) n.focus(); }, 0);
}
const rolarChat = () => setTimeout(() => { const c = $('#chat'); if (c) c.scrollTop = c.scrollHeight; }, 0);

// ---------- desenho da tela ----------
let VIEW = { v: 'inicio' };
function ir(v, extra = {}) { VIEW = { v, ...extra }; render(); scrollTo(0, 0); }
function render() {
  const app = $('#app');
  for (const k in CHARTS) delete CHARTS[k];
  EM_EDICAO = () => false;
  if (!U) { document.title = cfg().nome; app.innerHTML = telaLogin(); return; }
  app.innerHTML = ehProf() ? telaProfessor() : telaAluno();
  document.title = cfg().nome;
  desenharGraficos();
  if (VIEW.depois) { const f = VIEW.depois; VIEW.depois = null; f(); }
}

// ---------- início ----------
function iniciar() {
  if (ONLINE) {
    api('GET', '/api/me').then((u) => { U = u; return carregar(); }).catch(() => { U = null; render(); });
    $('#app').innerHTML = '<p class="vazio">Carregando…</p>';
    return;
  }
  S = carregarDemo(); salvar();
  try { const u = JSON.parse(sessionStorage.getItem(KEY + '-u')); if (u && (u.perfil === 'professor' || alunoPor(u.alunoId))) U = u; } catch (e) {}
  if (ehProf()) prepararProfessor();
  render();
}
