// Consultoria de musculação — telas do PROFESSOR
'use strict';
const OBJETIVOS = ['Hipertrofia', 'Emagrecimento', 'Força', 'Condicionamento', 'Saúde e qualidade de vida', 'Reabilitação', 'Performance esportiva', 'Outro'];
const NIVEIS = ['Iniciante', 'Intermediário', 'Avançado'];
const MODALIDADES = ['Online', 'Presencial', 'Híbrido'];
const STATUS = ['Ativo', 'Pausado', 'Encerrado'];
const FORMAS = ['Pix', 'Dinheiro', 'Cartão', 'Transferência', 'Boleto'];
let ACESSOS = null, MENU_ABERTO = false;

// ---------- o que está pendente para o professor ----------
const naoLidasProf = (alunoId) => S.mensagens.filter((m) => m.de === 'aluno' && !m.lida && (!alunoId || m.alunoId === alunoId)).length;
const naoVistos = (col, alunoId) => S[col].filter((x) => !x.visto && (!alunoId || x.alunoId === alunoId)).length;
const ativos = () => S.alunos.filter((a) => a.status === 'Ativo');
function atrasados() { const h = hoje(); return S.pagamentos.filter((p) => !p.pago && p.venc < h && alunoPor(p.alunoId)); }
function atencao() {
  const c = cfg(), h = hoje(), out = [];
  for (const a of ativos()) {
    const t = treinoAtivo(a.id), ult = ultimoTreino(a.id);
    if (!t) out.push({ a, nivel: 'warn', txt: 'Está sem treino montado', acao: `<button class="btn sm" onclick="ir('aluno',{id:'${a.id}',aba:'treinos'})">Montar treino</button>` });
    else {
      const ref = ult || t.inicio || a.inicio;
      const dias = ref ? diasEntre(ref, h) : 0;
      if (dias >= (Number(c.diasSemTreino) || 5)) out.push({ a, nivel: dias >= 10 ? 'bad' : 'warn', txt: ult ? `Não treina há ${dias} dias` : `Ainda não registrou nenhum treino (${dias} dias)`, wa: `Oi, ${primeiroNome(a.nome)}! Tudo bem? Senti sua falta nos treinos. Bora voltar? Qualquer dificuldade me fala que a gente ajusta. 💪` });
      if (t.fim && diasEntre(h, t.fim) <= 7) out.push({ a, nivel: t.fim < h ? 'bad' : 'warn', txt: t.fim < h ? `Treino venceu em ${dataBR(t.fim)}` : `Treino vence em ${dataBR(t.fim)}`, acao: `<button class="btn sm" onclick="ir('aluno',{id:'${a.id}',aba:'treinos'})">Renovar</button>` });
    }
    if (a.modalidade !== 'Presencial') {
      const ck = checkinsDo(a.id)[0], ref = ck ? ck.data : a.inicio;
      const d = ref ? diasEntre(ref, h) : 0, lim = Number(c.diasCheckin) || 7;
      if (d > lim) out.push({ a, nivel: 'warn', txt: ck ? `Check-in atrasado (último ${relDias(ck.data)})` : 'Ainda não enviou check-in', wa: `Oi, ${primeiroNome(a.nome)}! Lembrete do check-in da semana: peso, sono, alimentação e como foram os treinos. Manda pelo app assim que puder. 🙂` });
    }
  }
  for (const p of atrasados()) { const a = alunoPor(p.alunoId); if (a) out.push({ a, nivel: 'bad', txt: `Mensalidade de ${MESES[+p.comp.slice(5) - 1]} vencida em ${dataBR(p.venc)} (${brl(p.valor)})`, wa: textoCobranca(a, p) }); }
  const peso = { bad: 0, warn: 1 };
  return out.sort((x, y) => peso[x.nivel] - peso[y.nivel]);
}
function textoCobranca(a, p) {
  const c = cfg();
  return `Oi, ${primeiroNome(a.nome)}! Passando para lembrar da mensalidade da consultoria de ${MESES[+p.comp.slice(5) - 1]}, no valor de ${brl(p.valor)}, com vencimento em ${dataBR(p.venc)}.${c.pix ? ' Chave Pix: ' + c.pix : ''} Obrigado!`;
}

// ---------- moldura ----------
function telaProfessor() {
  const c = cfg(), v = VIEW.v;
  const pend = naoVistos('execucoes') + naoVistos('checkins') + naoVistos('fotos');
  const navs = [['inicio', '◧', 'Painel', pend], ['alunos', '☺', 'Alunos'], ['mensagens', '✉', 'Mensagens', naoLidasProf()], ['modelos', '☰', 'Modelos de treino'],
    ['exercicios', '⚲', 'Exercícios'], ['financeiro', '$', 'Financeiro', atrasados().length], ['config', '⚙', 'Configurações']];
  const ativo = v === 'aluno' ? 'alunos' : v === 'editor' ? (VIEW.rasc && VIEW.rasc.alunoId ? 'alunos' : 'modelos') : v;
  const telas = { inicio: vPainel, alunos: vAlunos, aluno: vAluno, editor: vEditor, modelos: vModelos, exercicios: vExercicios, mensagens: vMensagens, financeiro: vFinanceiro, config: vConfig };
  const corpo = (telas[v] || vPainel)();
  return `<div class="app-prof">
    <div class="topbar"><button class="icon-btn" onclick="menu(true)" aria-label="Abrir menu">☰</button><b class="grow">${esc(c.nome)}</b>${pend + naoLidasProf() ? `<span class="badge">${pend + naoLidasProf()}</span>` : ''}</div>
    ${MENU_ABERTO ? '<div class="veu" onclick="menu(false)"></div>' : ''}
    <aside class="side${MENU_ABERTO ? ' aberto' : ''}">
      <div class="brand"><div class="logo">${esc(iniciais(c.nome))}</div><div><div class="nm">${esc(c.nome)}</div><div class="sb">${esc(c.professor)}</div></div></div>
      ${navs.map(([k, ic, t, n]) => `<button class="nav${ativo === k ? ' on' : ''}" onclick="menu(false);ir('${k}')"><span class="ic">${ic}</span>${t}${n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}
      <div class="fim">${ONLINE ? '' : '<button class="nav" onclick="sair()"><span class="ic">⇄</span>Trocar de visão (demo)</button>'}
      ${ONLINE ? '<button class="nav" onclick="sair()"><span class="ic">⏻</span>Sair</button>' : ''}</div>
    </aside>
    <main class="main">${corpo}</main></div>`;
}
function menu(abrir) { MENU_ABERTO = abrir; render(); }

// ---------- painel ----------
function vPainel() {
  const at = ativos(), h = hoje(), ini7 = addDias(h, -6);
  const treinos7 = S.execucoes.filter((e) => e.data >= ini7 && alunoPor(e.alunoId)).length;
  const treinaram = new Set(S.execucoes.filter((e) => e.data >= ini7).map((e) => e.alunoId)).size;
  const pend = naoVistos('execucoes') + naoVistos('checkins') + naoVistos('fotos'), msgs = naoLidasProf();
  const atr = atrasados(), lista = atencao();
  const online = at.filter((a) => a.modalidade !== 'Presencial').length;
  return `<div class="page-head"><div><h1>Olá, ${esc(primeiroNome(cfg().professor))}</h1><p class="muted" style="margin:4px 0 0">${SEMANA[new Date().getDay()]}, ${dataBR(h)}</p></div>
    <button class="btn pri" onclick="editarAluno()">+ Novo aluno</button></div>
    <div class="grid g4">
      <div class="tile click" onclick="ir('alunos')"><div class="lbl">Alunos ativos</div><div class="val">${at.length}</div><div class="sub">${online} online · ${at.length - online} presencial</div></div>
      <div class="tile"><div class="lbl">Treinos nos últimos 7 dias</div><div class="val">${treinos7}</div><div class="sub">${treinaram} de ${at.length} alunos treinaram</div></div>
      <div class="tile click" onclick="document.getElementById('feed').scrollIntoView({behavior:'smooth'})"><div class="lbl">Novidades para ver</div><div class="val">${pend + msgs}</div><div class="sub">${pend} registros · ${msgs} mensagens</div></div>
      <div class="tile click" onclick="ir('financeiro')"><div class="lbl">Mensalidades atrasadas</div><div class="val">${atr.length}</div><div class="sub">${brl(atr.reduce((s, p) => s + p.valor, 0))}</div></div>
    </div>
    <div class="grid g2" style="margin-top:14px;align-items:start">
      <div class="card"><div class="card-head"><h2>Precisa de atenção</h2><span class="pill">${lista.length}</span></div>
        ${lista.length ? `<div class="feed">${lista.slice(0, 14).map((x) => `<div class="it"><div class="av">${esc(iniciais(x.a.nome))}</div><div class="ct">
          <div class="row sp"><a href="#" class="b" style="color:inherit;text-decoration:none" onclick="event.preventDefault();ir('aluno',{id:'${x.a.id}'})">${esc(x.a.nome)}</a><span class="pill ${x.nivel}">${x.nivel === 'bad' ? '!' : '•'}</span></div>
          <div class="small" style="color:var(--ink2)">${esc(x.txt)}</div>
          <div class="row" style="margin-top:6px">${x.acao || ''}${x.wa && x.a.whatsapp ? `<a class="btn sm wa" target="_blank" rel="noopener" href="${esc(waLink(x.a.whatsapp, x.wa))}">WhatsApp</a>` : ''}</div></div></div>`).join('')}</div>${lista.length > 14 ? `<p class="small muted">E mais ${lista.length - 14}.</p>` : ''}`
        : '<p class="vazio">Tudo em dia por aqui. 👏</p>'}</div>
      <div class="card" id="feed"><div class="card-head"><h2>Atividade dos alunos</h2>${pend ? `<button class="btn sm ghost" onclick="marcarTudoVisto()">Marcar tudo como visto</button>` : ''}</div>${feedAtividade(null, 20)}</div>
    </div>`;
}
function marcarTudoVisto() { for (const c of ['execucoes', 'checkins', 'fotos']) S[c].forEach((x) => { if (!x.visto) x.visto = true; }); salvar(); render(); }
function feedAtividade(alunoId, max) {
  const itens = [];
  for (const e of S.execucoes) if (!alunoId || e.alunoId === alunoId) itens.push({ t: 'exec', x: e, k: e.fim || e.data });
  for (const c of S.checkins) if (!alunoId || c.alunoId === alunoId) itens.push({ t: 'ck', x: c, k: c.em || c.data + 'T12' });
  const fotosDia = {};
  for (const f of S.fotos) if ((!alunoId || f.alunoId === alunoId) && f.enviadaPor !== 'prof') { const k = f.alunoId + f.data; (fotosDia[k] = fotosDia[k] || []).push(f); }
  for (const fs of Object.values(fotosDia)) itens.push({ t: 'foto', x: fs[0], fs, k: fs[0].data + 'T23' });
  itens.sort((a, b) => String(b.k).localeCompare(String(a.k)));
  const v = itens.filter((i) => alunoPor(i.x.alunoId)).slice(0, max);
  if (!v.length) return '<p class="vazio">Quando os alunos registrarem treinos e check-ins, eles aparecem aqui.</p>';
  return `<div class="feed">${v.map((i) => {
    const a = alunoPor(i.x.alunoId), novo = i.t === 'foto' ? i.fs.some((f) => !f.visto) : !i.x.visto;
    let tit = '', det = '', acts = '';
    if (i.t === 'exec') {
      const e = i.x, tot = (e.itens || []).reduce((s, it) => s + (it.series || []).length, 0), ok = (e.itens || []).reduce((s, it) => s + (it.series || []).filter((x) => x.ok).length, 0);
      tit = `concluiu <b>${esc(e.diaNome || 'treino')}</b>`;
      det = `${relDias(e.data)} · ${ok}/${tot} séries${e.duracao ? ' · ' + e.duracao + ' min' : ''}${e.esforco ? ' · esforço ' + e.esforco + '/10' : ''}`;
      if (e.comentario) det += `<div class="quote">${esc(e.comentario)}</div>`;
      if (e.resposta) det += `<div class="quote prof"><b>Você:</b> ${esc(e.resposta)}</div>`;
      acts = `<button class="btn sm" onclick="responder('execucoes','${e.id}')">${e.resposta ? 'Editar resposta' : 'Responder'}</button><button class="btn sm ghost" onclick="ir('aluno',{id:'${a.id}',aba:'historico'})">Ver detalhes</button>`;
    } else if (i.t === 'ck') {
      const c = i.x;
      tit = 'enviou o <b>check-in</b>';
      det = `${relDias(c.data)}${c.peso ? ' · ' + num(c.peso) + ' kg' : ''}${c.sono ? ' · sono ' + c.sono + '/5' : ''}${c.alimentacao ? ' · dieta ' + c.alimentacao + '/5' : ''}${c.energia ? ' · energia ' + c.energia + '/5' : ''}`;
      if (c.dor) det += `<div class="quote" style="border-left:3px solid var(--warn)"><b>Dor/desconforto:</b> ${esc(c.dor)}</div>`;
      if (c.comentario) det += `<div class="quote">${esc(c.comentario)}</div>`;
      if (c.resposta) det += `<div class="quote prof"><b>Você:</b> ${esc(c.resposta)}</div>`;
      acts = `<button class="btn sm" onclick="responder('checkins','${c.id}')">${c.resposta ? 'Editar resposta' : 'Responder'}</button>`;
    } else {
      tit = `enviou <b>${i.fs.length} foto${i.fs.length > 1 ? 's' : ''}</b> de evolução`;
      det = `${relDias(i.x.data)}<div class="row" style="margin-top:6px">${i.fs.map((f) => `<img src="${f.img}" alt="${esc(f.pose || 'foto')}" onclick="verFoto('${f.id}')" style="width:54px;height:72px;object-fit:cover;border-radius:6px;cursor:pointer">`).join('')}</div>`;
      acts = `<button class="btn sm" onclick="ir('aluno',{id:'${a.id}',aba:'evolucao'})">Ver evolução</button>`;
    }
    const visto = novo ? `<button class="btn sm ghost" onclick="marcarVisto('${i.t}','${i.t === 'foto' ? i.fs.map((f) => f.id).join(',') : i.x.id}')">Marcar como visto</button>` : '';
    return `<div class="it"><div class="av">${esc(iniciais(a.nome))}</div><div class="ct">
      <div>${novo ? '<span class="dot" title="Novo"></span> ' : ''}<a href="#" class="b" style="color:inherit;text-decoration:none" onclick="event.preventDefault();ir('aluno',{id:'${a.id}'})">${esc(a.nome)}</a> ${tit}</div>
      <div class="small muted">${det}</div><div class="row" style="margin-top:8px">${acts}${visto}</div></div></div>`;
  }).join('')}</div>`;
}
function marcarVisto(t, ids) {
  const col = t === 'exec' ? 'execucoes' : t === 'ck' ? 'checkins' : 'fotos';
  for (const id of ids.split(',')) { const x = S[col].find((y) => y.id === id); if (x) x.visto = true; }
  salvar(); render();
}
function responder(col, id) {
  const x = S[col].find((y) => y.id === id); if (!x) return; const a = alunoPor(x.alunoId);
  const ctx = col === 'execucoes' ? `${esc(x.diaNome || 'Treino')} em ${dataBR(x.data)}` : `Check-in de ${dataBR(x.data)}`;
  abrirModal('Responder ' + primeiroNome(a?.nome), `<p class="small muted" style="margin-top:0">${ctx}</p>${x.comentario ? `<div class="quote" style="margin-bottom:12px">${esc(x.comentario)}</div>` : ''}
    ${areaCampo('Sua resposta (o aluno vê no app)', 'resposta', x.resposta || '', 'required rows="4"')}`,
  (d) => { x.resposta = d.resposta; x.respondidoEm = new Date().toISOString(); x.visto = true; salvar(); toast('Resposta enviada'); }, 'Enviar resposta');
}

// ---------- alunos ----------
function vAlunos() {
  const f = VIEW.f || 'Ativo', q = (VIEW.q || '').toLowerCase();
  let lista = S.alunos.filter((a) => (f === 'Todos' || a.status === f) && (!q || a.nome.toLowerCase().includes(q)));
  lista.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  const cont = (s) => S.alunos.filter((a) => s === 'Todos' || a.status === s).length;
  return `<div class="page-head"><h1>Alunos</h1><button class="btn pri" onclick="editarAluno()">+ Novo aluno</button></div>
    <div class="card"><div class="row sp" style="margin-bottom:12px">
      <input class="i" style="max-width:320px" placeholder="Buscar pelo nome…" value="${esc(VIEW.q || '')}" oninput="VIEW.q=this.value;clearTimeout(window._bq);window._bq=setTimeout(()=>{render();const i=document.querySelector('.card input.i');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)">
      <div class="seg">${[...STATUS, 'Todos'].map((s) => `<button class="${f === s ? 'on' : ''}" onclick="VIEW.f='${s}';render()">${s} (${cont(s)})</button>`).join('')}</div></div>
    ${lista.length ? `<div class="tbl-wrap"><table><thead><tr><th>Aluno</th><th>Modalidade</th><th>Último treino</th><th class="r">Treinos 30 dias</th><th>Treino atual</th><th>Situação</th></tr></thead><tbody>
    ${lista.map((a) => {
      const ult = ultimoTreino(a.id), t = treinoAtivo(a.id), n30 = treinosNoPeriodo(a.id, 30), alvo = Math.round((Number(a.diasSemana) || 3) * 30 / 7);
      const dias = ult ? diasEntre(ult, hoje()) : null, lim = Number(cfg().diasSemTreino) || 5;
      const venc = t && t.fim ? (t.fim < hoje() ? '<span class="pill bad">vencido</span>' : diasEntre(hoje(), t.fim) <= 7 ? `<span class="pill warn">vence ${dataCurta(t.fim)}</span>` : `<span class="small muted">até ${dataCurta(t.fim)}</span>`) : '';
      const pend = naoLidasProf(a.id) + naoVistos('execucoes', a.id) + naoVistos('checkins', a.id) + naoVistos('fotos', a.id);
      return `<tr class="click" onclick="ir('aluno',{id:'${a.id}'})"><td><div class="row" style="flex-wrap:nowrap"><div class="av">${esc(iniciais(a.nome))}</div><div><div class="b">${esc(a.nome)} ${pend ? `<span class="badge">${pend}</span>` : ''}</div><div class="small muted">${esc(a.objetivo || '')}</div></div></div></td>
        <td><span class="pill ${a.modalidade === 'Presencial' ? '' : 'info'}">${esc(a.modalidade || 'Online')}</span></td>
        <td class="nw">${a.status === 'Ativo' && (dias == null || dias >= lim) ? `<span class="pill ${dias == null || dias >= 10 ? 'bad' : 'warn'}">${relDias(ult)}</span>` : relDias(ult)}</td>
        <td class="r"><b>${n30}</b> <span class="small muted">/ ${alvo}</span></td>
        <td>${t ? `<div class="small">${esc(t.nome)}</div>${venc}` : a.status === 'Ativo' ? '<span class="pill warn">sem treino</span>' : '—'}</td>
        <td><span class="pill ${a.status === 'Ativo' ? 'ok' : a.status === 'Pausado' ? 'warn' : ''}">${a.status}</span></td></tr>`;
    }).join('')}</tbody></table></div>` : `<p class="vazio">${S.alunos.length ? 'Nenhum aluno encontrado.' : 'Cadastre o primeiro aluno para começar.'}</p>`}</div>`;
}
function editarAluno(id) {
  const a = id ? alunoPor(id) : { status: 'Ativo', modalidade: 'Online', objetivo: 'Hipertrofia', nivel: 'Iniciante', diasSemana: 4, inicio: hoje(), diaVenc: Number(hoje().slice(8)) > 28 ? 28 : Number(hoje().slice(8)) };
  abrirModal(id ? 'Editar aluno' : 'Novo aluno', `<div class="fgrid">
    <div class="full">${campo('Nome completo', 'nome', a.nome, 'text', 'required maxlength="80"')}</div>
    ${campo('WhatsApp (com DDD)', 'whatsapp', a.whatsapp, 'tel', 'placeholder="92 99999-9999"')}
    ${campo('E-mail', 'email', a.email, 'email')}
    ${campo('Data de nascimento', 'nasc', a.nasc, 'date')}
    ${selCampo('Sexo', 'sexo', [['', '—'], 'Feminino', 'Masculino', 'Outro'], a.sexo)}
    ${campo('Altura (cm)', 'altura', a.altura, 'number', 'min="100" max="230" step="1"')}
    ${selCampo('Objetivo', 'objetivo', OBJETIVOS, a.objetivo)}
    ${selCampo('Nível', 'nivel', NIVEIS, a.nivel)}
    ${selCampo('Modalidade', 'modalidade', MODALIDADES, a.modalidade)}
    ${selCampo('Treinos por semana', 'diasSemana', [1, 2, 3, 4, 5, 6, 7], a.diasSemana)}
    ${campo('Início da consultoria', 'inicio', a.inicio, 'date')}
    ${selCampo('Situação', 'status', STATUS, a.status)}
    <div class="full"><h3 style="margin:6px 0 0">Plano</h3></div>
    ${campo('Nome do plano', 'plano', a.plano, 'text', 'placeholder="Ex.: Mensal online"')}
    ${campo('Valor mensal (R$)', 'valor', a.valor, 'number', 'min="0" step="0.01"')}
    ${selCampo('Dia do vencimento', 'diaVenc', Array.from({ length: 28 }, (_, i) => i + 1), a.diaVenc)}
    <div class="full">${areaCampo('Lesões, dores ou limitações (o aluno também vê)', 'restricoes', a.restricoes, 'rows="2" placeholder="Ex.: condromalácia no joelho direito; evitar impacto"')}</div>
    <div class="full">${areaCampo('Anotações particulares (só você vê)', 'notas', a.notas, 'rows="2"')}</div></div>`,
  (d) => {
    const novo = !id, x = id ? alunoPor(id) : { id: uid('a'), criadoEm: new Date().toISOString() };
    Object.assign(x, d, { altura: lerNum(d.altura), valor: lerNum(d.valor) || 0, diasSemana: Number(d.diasSemana), diaVenc: Number(d.diaVenc) });
    if (novo) S.alunos.push(x);
    gerarMensalidades(); salvar();
    if (novo) { VIEW = { v: 'aluno', id: x.id, aba: 'treinos' }; toast('Aluno cadastrado. Agora monte o treino dele.'); }
  }, id ? 'Salvar' : 'Cadastrar', { lg: true, extra: id ? `<button type="button" class="btn danger" style="margin-right:auto" onclick="apagarAluno('${id}')">Apagar aluno</button>` : '' });
}
function apagarAluno(id) {
  const a = alunoPor(id);
  if (!confirm(`Apagar ${a.nome} e TODO o histórico (treinos, avaliações, fotos, mensagens e pagamentos)? Isso não tem volta.\n\nSe ele só parou, prefira mudar a situação para "Encerrado".`)) return;
  for (const c of ['treinos', 'execucoes', 'avaliacoes', 'fotos', 'checkins', 'mensagens', 'pagamentos']) S[c] = S[c].filter((x) => x.alunoId !== id);
  S.alunos = S.alunos.filter((x) => x.id !== id);
  salvar(); fecharModal(); ir('alunos');
}

// ---------- página do aluno ----------
function vAluno() {
  const a = alunoPor(VIEW.id); if (!a) return '<p class="vazio">Aluno não encontrado.</p>';
  const aba = VIEW.aba || 'resumo';
  if (aba === 'historico') S.execucoes.forEach((e) => { if (e.alunoId === a.id && !e.visto) { e.visto = true; atrasoSalvar(); } });
  if (aba === 'checkins') S.checkins.forEach((e) => { if (e.alunoId === a.id && !e.visto) { e.visto = true; atrasoSalvar(); } });
  if (aba === 'evolucao') S.fotos.forEach((e) => { if (e.alunoId === a.id && !e.visto) { e.visto = true; atrasoSalvar(); } });
  if (aba === 'mensagens') { marcarLidas(a.id); rolarChat(); }
  const abas = [['resumo', 'Resumo'], ['treinos', 'Treinos'], ['historico', 'Histórico', naoVistos('execucoes', a.id)], ['evolucao', 'Evolução', naoVistos('fotos', a.id)],
    ['checkins', 'Check-ins', naoVistos('checkins', a.id)], ['mensagens', 'Mensagens', naoLidasProf(a.id)], ['financeiro', 'Financeiro'], ['acesso', 'Acesso ao app']];
  const tel = { resumo: abaResumo, treinos: abaTreinos, historico: abaHistorico, evolucao: abaEvolucao, checkins: abaCheckins, mensagens: (x) => `<div class="card">${chatHTML(x.id)}</div>`, financeiro: abaFinanceiro, acesso: abaAcesso };
  return `<button class="btn ghost sm" onclick="ir('alunos')">← Alunos</button>
    <div class="row sp" style="margin-top:10px"><div class="row" style="flex-wrap:nowrap"><div class="av lg">${esc(iniciais(a.nome))}</div><div>
      <h1>${esc(a.nome)}</h1><div class="row" style="gap:6px;margin-top:6px">
      <span class="pill ${a.status === 'Ativo' ? 'ok' : a.status === 'Pausado' ? 'warn' : ''}">${a.status}</span><span class="pill info">${esc(a.modalidade || 'Online')}</span>
      ${a.objetivo ? `<span class="pill">${esc(a.objetivo)}</span>` : ''}${a.nivel ? `<span class="pill">${esc(a.nivel)}</span>` : ''}</div></div></div>
      <div class="row">${a.whatsapp ? `<a class="btn wa" target="_blank" rel="noopener" href="${esc(waLink(a.whatsapp, 'Oi, ' + primeiroNome(a.nome) + '! '))}">WhatsApp</a>` : ''}<button class="btn" onclick="editarAluno('${a.id}')">Editar dados</button></div></div>
    <div class="tabs">${abas.map(([k, t, n]) => `<button class="${aba === k ? 'on' : ''}" onclick="VIEW.aba='${k}';render()">${t}${n ? ` <span class="badge">${n}</span>` : ''}</button>`).join('')}</div>
    ${tel[aba](a)}`;
}
let _salvarT; function atrasoSalvar() { clearTimeout(_salvarT); _salvarT = setTimeout(salvar, 300); }

function abaResumo(a) {
  const ult = ultimoTreino(a.id), t = treinoAtivo(a.id), n30 = treinosNoPeriodo(a.id, 30), alvo = Math.round((Number(a.diasSemana) || 3) * 30 / 7);
  const pesos = pesosDo(a.id), pa = pesos[pesos.length - 1], p0 = pesos[0];
  const delta = pa && p0 && pesos.length > 1 ? pa.v - p0.v : null, id = idade(a.nasc);
  const ultAv = avalsDo(a.id)[0];
  return `<div class="grid g4">
    <div class="tile"><div class="lbl">Último treino</div><div class="val" style="font-size:22px">${relDias(ult)}</div><div class="sub">${ult ? dataBR(ult) : 'nenhum registrado'}</div></div>
    <div class="tile"><div class="lbl">Treinos em 30 dias</div><div class="val">${n30}<span class="small muted"> / ${alvo}</span></div><div class="progress" style="margin-top:6px"><i style="width:${Math.min(100, Math.round(n30 / (alvo || 1) * 100))}%"></i></div><div class="sub">${Math.round(n30 / (alvo || 1) * 100)}% do planejado (${a.diasSemana || 3}x por semana)</div></div>
    <div class="tile"><div class="lbl">Peso atual</div><div class="val">${pa ? num(pa.v) + '<span class="small muted"> kg</span>' : '—'}</div><div class="sub">${delta != null ? `${delta > 0 ? '+' : ''}${num(delta)} kg desde ${dataCurta(p0.data)}` : 'sem registros'}</div></div>
    <div class="tile click" onclick="VIEW.aba='treinos';render()"><div class="lbl">Treino atual</div><div class="val" style="font-size:17px;margin-top:6px">${t ? esc(t.nome) : 'Sem treino'}</div><div class="sub">${t ? `${t.dias.length} divisões${t.fim ? ' · até ' + dataBR(t.fim) : ''}` : 'Toque para montar'}</div></div></div>
    <div class="grid g2" style="margin-top:14px;align-items:start">
      <div class="card"><h2>Frequência por semana</h2><p class="small muted" style="margin:-4px 0 8px">Treinos registrados nas últimas 8 semanas · meta ${a.diasSemana || 3} por semana</p>${grafico(frequenciaSemanal(a.id), { tipo: 'barras', unid: 'treinos', dec: 0, titulo: 'Treinos por semana' })}</div>
      <div class="card"><div class="card-head"><h2>Dados</h2><button class="btn sm" onclick="editarAluno('${a.id}')">Editar</button></div>
        <table><tbody>
        <tr><td class="muted">Idade</td><td>${id != null ? id + ' anos' : '—'}</td></tr>
        <tr><td class="muted">Altura</td><td>${a.altura ? a.altura + ' cm' : '—'}${ultAv && ultAv.peso && a.altura ? ` · IMC ${num(ultAv.peso / Math.pow(a.altura / 100, 2))}` : ''}</td></tr>
        <tr><td class="muted">WhatsApp</td><td>${esc(a.whatsapp || '—')}</td></tr>
        <tr><td class="muted">E-mail</td><td>${esc(a.email || '—')}</td></tr>
        <tr><td class="muted">Início</td><td>${dataBR(a.inicio)}${a.inicio ? ` (${relDias(a.inicio)})` : ''}</td></tr>
        <tr><td class="muted">Plano</td><td>${esc(a.plano || '—')}${a.valor ? ` · ${brl(a.valor)} · vence dia ${a.diaVenc}` : ''}</td></tr>
        </tbody></table>
        ${a.restricoes ? `<div class="quote" style="border-left:3px solid var(--warn);margin-top:10px"><b>Limitações:</b> ${esc(a.restricoes)}</div>` : ''}
        ${a.notas ? `<div class="quote prof" style="margin-top:8px"><b>Suas anotações:</b> ${esc(a.notas)}</div>` : ''}</div></div>
    <div class="card" style="margin-top:14px"><h2>Atividade recente</h2>${feedAtividade(a.id, 6)}</div>`;
}

// ---------- treinos do aluno ----------
function resumoTreino(t) {
  return t.dias.map((d) => `<div style="margin-top:10px"><div class="b">${esc(d.nome)}</div><ol class="small" style="margin:4px 0 0;padding-left:20px;color:var(--ink2)">${d.itens.map((it) => { const ex = exPor(it.exId); return `<li>${esc(ex ? ex.nome : 'Exercício removido')} — ${esc(it.series || '?')}×${esc(it.reps || '?')}${it.carga ? ' · ' + esc(it.carga) : ''}${it.metodo && it.metodo !== 'Normal' ? ' · ' + esc(it.metodo) : ''}</li>`; }).join('')}</ol></div>`).join('');
}
function abaTreinos(a) {
  const ts = treinosDo(a.id);
  return `<div class="row sp" style="margin-bottom:12px"><p class="muted" style="margin:0">O treino <b>ativo</b> é o que aparece no app do aluno.</p><button class="btn pri" onclick="novoTreino('${a.id}')">+ Novo treino</button></div>
    ${ts.length ? ts.map((t) => `<div class="card" style="margin-bottom:12px${t.ativo ? ';border-color:var(--accent)' : ''}">
      <div class="card-head"><div><h2>${esc(t.nome)} ${t.ativo ? '<span class="pill acc">Ativo</span>' : '<span class="pill">Arquivado</span>'}</h2>
        <div class="small muted" style="margin-top:4px">${t.inicio ? dataBR(t.inicio) : ''}${t.fim ? ' até ' + dataBR(t.fim) : ''} · ${t.dias.length} divisões · ${S.execucoes.filter((e) => e.treinoId === t.id).length} treinos registrados</div></div>
        <div class="row"><button class="btn sm" onclick="abrirEditor('${t.id}')">Editar</button>
        ${t.ativo ? `<button class="btn sm ghost" onclick="ativarTreino('${t.id}',false)">Arquivar</button>` : `<button class="btn sm" onclick="ativarTreino('${t.id}',true)">Ativar</button>`}
        <button class="btn sm ghost" onclick="duplicarTreino('${t.id}')">Duplicar</button><button class="btn sm ghost" onclick="comoModelo('${t.id}')">Salvar como modelo</button>
        <button class="btn sm ghost danger" onclick="apagarTreino('${t.id}')">Apagar</button></div></div>
      ${t.obs ? `<div class="quote">${esc(t.obs)}</div>` : ''}${t.ativo ? resumoTreino(t) : ''}</div>`).join('') : '<div class="card"><p class="vazio">Nenhum treino montado ainda.</p></div>'}`;
}
function novoTreino(alunoId) {
  const modelos = S.treinos.filter((t) => !t.alunoId), atual = treinoAtivo(alunoId), a = alunoPor(alunoId);
  abrirModal('Novo treino para ' + primeiroNome(a.nome), `<div class="stack">
    <label class="row"><input type="radio" name="base" value="branco" checked> Começar em branco</label>
    ${modelos.length ? `<label class="row"><input type="radio" name="base" value="modelo"> A partir de um modelo:</label>${selCampo('', 'modelo', modelos.map((m) => [m.id, m.nome]), modelos[0].id, 'onchange="this.form.base.value=\'modelo\'"')}` : '<p class="small muted">Dica: crie modelos de treino em "Modelos de treino" para montar mais rápido.</p>'}
    ${atual ? `<label class="row"><input type="radio" name="base" value="atual"> Copiar o treino atual (${esc(atual.nome)}) para ajustar</label>` : ''}
    <div class="fgrid">${campo('Início', 'inicio', hoje(), 'date')}${campo('Validade até', 'fim', addDias(hoje(), 42), 'date')}</div>
    <p class="small muted" style="margin:0">Ao salvar, este passa a ser o treino ativo e o anterior fica arquivado no histórico.</p></div>`,
  (d) => {
    let base = { nome: 'Novo treino', dias: [{ id: uid('d'), nome: 'Treino A', itens: [] }] };
    if (d.base === 'modelo') base = S.treinos.find((t) => t.id === d.modelo) || base;
    if (d.base === 'atual' && atual) base = atual;
    const t = JSON.parse(JSON.stringify(base));
    Object.assign(t, { id: uid('t'), alunoId, inicio: d.inicio, fim: d.fim, ativo: true, criadoEm: new Date().toISOString() });
    t.dias.forEach((di) => { di.id = uid('d'); di.itens.forEach((it) => (it.id = uid('i'))); });
    VIEW = { v: 'editor', rasc: t, novo: true, volta: { v: 'aluno', id: alunoId, aba: 'treinos' } };
  }, 'Continuar');
}
function ativarTreino(id, on) {
  const t = S.treinos.find((x) => x.id === id);
  if (on) S.treinos.forEach((x) => { if (x.alunoId === t.alunoId) x.ativo = false; });
  t.ativo = on; salvar(); render(); toast(on ? 'Treino ativado: já aparece no app do aluno' : 'Treino arquivado');
}
function duplicarTreino(id) {
  const t = JSON.parse(JSON.stringify(S.treinos.find((x) => x.id === id)));
  Object.assign(t, { id: uid('t'), nome: t.nome + ' (cópia)', ativo: false, criadoEm: new Date().toISOString() });
  t.dias.forEach((di) => { di.id = uid('d'); di.itens.forEach((it) => (it.id = uid('i'))); });
  S.treinos.push(t); salvar(); render(); toast('Cópia criada (arquivada). Edite e ative quando quiser.');
}
function comoModelo(id) {
  const t = JSON.parse(JSON.stringify(S.treinos.find((x) => x.id === id)));
  Object.assign(t, { id: uid('t'), alunoId: null, ativo: false, inicio: null, fim: null, notas: '' });
  t.dias.forEach((di) => { di.id = uid('d'); di.itens.forEach((it) => (it.id = uid('i'))); });
  S.treinos.push(t); salvar(); toast('Salvo em "Modelos de treino"');
}
function apagarTreino(id) {
  const t = S.treinos.find((x) => x.id === id), n = S.execucoes.filter((e) => e.treinoId === id).length;
  if (!confirm(`Apagar o treino "${t.nome}"?${n ? `\n\nOs ${n} treinos já registrados com ele continuam no histórico.` : ''}`)) return;
  S.treinos = S.treinos.filter((x) => x.id !== id); salvar(); render();
}

// ---------- editor de treino (também usado pelos modelos) ----------
function abrirEditor(id) {
  const t = S.treinos.find((x) => x.id === id); if (!t) return;
  const volta = t.alunoId ? { v: 'aluno', id: t.alunoId, aba: 'treinos' } : { v: 'modelos' };
  VIEW = { v: 'editor', rasc: JSON.parse(JSON.stringify(t)), volta }; render(); scrollTo(0, 0);
}
function opcoesEx(sel) {
  return GRUPOS.map((g) => { const xs = S.exercicios.filter((e) => e.grupo === g).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')); return xs.length ? `<optgroup label="${esc(g)}">${xs.map((e) => `<option value="${e.id}"${e.id === sel ? ' selected' : ''}>${esc(e.nome)}</option>`).join('')}</optgroup>` : ''; }).join('')
    + (() => { const outros = S.exercicios.filter((e) => !GRUPOS.includes(e.grupo)); return outros.length ? `<optgroup label="Outros">${outros.map((e) => `<option value="${e.id}"${e.id === sel ? ' selected' : ''}>${esc(e.nome)}</option>`).join('')}</optgroup>` : ''; })();
}
function vEditor() {
  const t = VIEW.rasc; if (!t) return vPainel();
  EM_EDICAO = () => VIEW.v === 'editor';
  const a = t.alunoId ? alunoPor(t.alunoId) : null;
  const inp = (path, val, extra = '', cls = 'i') => `<input class="${cls}" value="${esc(val ?? '')}" oninput="edSet('${path}',this.value)" ${extra}>`;
  return `<div class="page-head"><div><button class="btn ghost sm" onclick="sairEditor()">← Voltar sem salvar</button>
      <h1 style="margin-top:8px">${a ? 'Treino de ' + esc(a.nome) : 'Modelo de treino'}</h1></div>
      <div class="row"><button class="btn" onclick="novoExercicio(true)">+ Cadastrar exercício</button><button class="btn pri" onclick="salvarEditor()">Salvar treino</button></div></div>
    ${a && a.restricoes ? `<div class="quote" style="border-left:3px solid var(--warn);margin-bottom:12px"><b>Limitações do aluno:</b> ${esc(a.restricoes)}</div>` : ''}
    <div class="card"><div class="fgrid">
      <label class="f full"><span>Nome do treino</span>${inp('nome', t.nome, 'placeholder="Ex.: Hipertrofia — Fase 1" maxlength="80"')}</label>
      ${a ? `<label class="f"><span>Início</span><input class="i" type="date" value="${esc(t.inicio || '')}" onchange="edSet('inicio',this.value)"></label>
      <label class="f"><span>Validade até</span><input class="i" type="date" value="${esc(t.fim || '')}" onchange="edSet('fim',this.value)"></label>` : ''}
      <label class="f full"><span>Orientações para o aluno (aparece no app)</span><textarea class="i" rows="2" oninput="edSet('obs',this.value)" placeholder="Ex.: aquecer 10 min na esteira; cardio de 20 min após o treino">${esc(t.obs || '')}</textarea></label>
      <label class="f full"><span>Anotações particulares (só você vê)</span><textarea class="i" rows="2" oninput="edSet('notas',this.value)">${esc(t.notas || '')}</textarea></label></div></div>
    ${t.dias.map((d, di) => `<div class="dia"><div class="dia-h"><input class="i" value="${esc(d.nome)}" oninput="edSet('dias.${di}.nome',this.value)" placeholder="Ex.: Treino A — Peito e tríceps">
        <button class="icon-btn" title="Subir" onclick="edMover('dias',${di},-1)" ${di ? '' : 'disabled'}>↑</button><button class="icon-btn" title="Descer" onclick="edMover('dias',${di},1)" ${di < t.dias.length - 1 ? '' : 'disabled'}>↓</button>
        <button class="icon-btn" title="Duplicar divisão" onclick="edDupDia(${di})">⧉</button><button class="icon-btn" title="Remover divisão" onclick="edRemover('dias',${di})">✕</button></div>
      <div class="ex-row ex-hdr"><span>#</span><span>Exercício</span><span>Séries</span><span>Repetições</span><span>Carga</span><span>Descanso</span><span>Método</span><span></span></div>
      ${d.itens.map((it, ii) => `<div class="ex-row"><span class="num">${ii + 1}</span>
        <select class="i exsel" onchange="edSet('dias.${di}.itens.${ii}.exId',this.value)">${opcoesEx(it.exId)}</select>
        <label><span class="lbm">Séries</span>${inp(`dias.${di}.itens.${ii}.series`, it.series, 'inputmode="numeric" placeholder="3"')}</label>
        <label><span class="lbm">Repetições</span>${inp(`dias.${di}.itens.${ii}.reps`, it.reps, 'placeholder="8-12"')}</label>
        <label><span class="lbm">Carga</span>${inp(`dias.${di}.itens.${ii}.carga`, it.carga, 'placeholder="ex.: 20 kg"')}</label>
        <label><span class="lbm">Descanso</span>${inp(`dias.${di}.itens.${ii}.descanso`, it.descanso, 'placeholder="60s"')}</label>
        <label><span class="lbm">Método</span><select class="i" onchange="edSet('dias.${di}.itens.${ii}.metodo',this.value)">${METODOS.map((m) => `<option${(it.metodo || 'Normal') === m ? ' selected' : ''}>${m}</option>`).join('')}</select></label>
        <span class="acts nw"><button class="icon-btn" title="Subir" onclick="edMover('dias.${di}.itens',${ii},-1)" ${ii ? '' : 'disabled'}>↑</button><button class="icon-btn" title="Descer" onclick="edMover('dias.${di}.itens',${ii},1)" ${ii < d.itens.length - 1 ? '' : 'disabled'}>↓</button><button class="icon-btn" title="Remover" onclick="edRemover('dias.${di}.itens',${ii})">✕</button></span>
        <div class="obs">${inp(`dias.${di}.itens.${ii}.obs`, it.obs, 'placeholder="Observação para o aluno (opcional): cadência, amplitude, pegada…"')}</div></div>`).join('')}
      <div style="padding:10px 12px"><button class="btn sm" onclick="edAddEx(${di})">+ Exercício</button></div></div>`).join('')}
    <div class="row" style="margin-top:14px"><button class="btn" onclick="edAddDia()">+ Divisão (Treino ${String.fromCharCode(65 + t.dias.length)})</button><span class="grow"></span><button class="btn pri" onclick="salvarEditor()">Salvar treino</button></div>`;
}
function edAlvo(path) { const ps = path.split('.'); let o = VIEW.rasc; for (let i = 0; i < ps.length - 1; i++) o = o[ps[i]]; return [o, ps[ps.length - 1]]; }
function edSet(path, v) { const [o, k] = edAlvo(path); o[k] = v; }
function edLista(path) { return path.split('.').reduce((o, k) => o[k], VIEW.rasc); }
function edMover(path, i, d) { const l = edLista(path); const [x] = l.splice(i, 1); l.splice(i + d, 0, x); render(); }
function edRemover(path, i) { const l = edLista(path); if (path === 'dias' && l[i].itens.length && !confirm(`Remover "${l[i].nome}" e seus ${l[i].itens.length} exercícios?`)) return; l.splice(i, 1); render(); }
function edAddEx(di) {
  const d = VIEW.rasc.dias[di], ult = d.itens[d.itens.length - 1];
  d.itens.push({ id: uid('i'), exId: ult ? ult.exId : S.exercicios[0]?.id, series: ult ? ult.series : '3', reps: ult ? ult.reps : '10-12', carga: '', descanso: ult ? ult.descanso : '60s', metodo: 'Normal', obs: '' });
  render(); setTimeout(() => { const s = $$('.dia')[di]?.querySelectorAll('.exsel'); if (s && s.length) s[s.length - 1].focus(); }, 0);
}
function edAddDia() { const t = VIEW.rasc; t.dias.push({ id: uid('d'), nome: 'Treino ' + String.fromCharCode(65 + t.dias.length), itens: [] }); render(); }
function edDupDia(di) { const t = VIEW.rasc, c = JSON.parse(JSON.stringify(t.dias[di])); c.id = uid('d'); c.nome += ' (cópia)'; c.itens.forEach((it) => (it.id = uid('i'))); t.dias.splice(di + 1, 0, c); render(); }
function sairEditor() { if (!confirm('Sair sem salvar as alterações deste treino?')) return; const v = VIEW.volta || { v: 'inicio' }; VIEW = v; render(); scrollTo(0, 0); }
function salvarEditor() {
  const t = VIEW.rasc;
  t.nome = String(t.nome || '').trim() || 'Treino';
  if (!t.dias.length) return toast('Adicione pelo menos uma divisão (Treino A).');
  if (t.dias.some((d) => !d.itens.length)) return toast('Há divisão sem exercícios. Adicione exercícios ou remova a divisão.');
  t.atualizadoEm = new Date().toISOString();
  const i = S.treinos.findIndex((x) => x.id === t.id);
  if (t.alunoId && t.ativo) S.treinos.forEach((x) => { if (x.alunoId === t.alunoId && x.id !== t.id) x.ativo = false; });
  if (i >= 0) S.treinos[i] = t; else S.treinos.push(t);
  const novo = VIEW.novo;
  salvar(); const v = VIEW.volta || { v: 'inicio' }; VIEW = v; render(); scrollTo(0, 0);
  toast(t.alunoId ? (novo ?'Treino salvo e liberado no app do aluno' : 'Treino salvo') : 'Modelo salvo');
}

// ---------- histórico ----------
function abaHistorico(a) {
  const es = execsDo(a.id);
  if (!es.length) return '<div class="card"><p class="vazio">O aluno ainda não registrou nenhum treino pelo app.</p></div>';
  return es.slice(0, VIEW.mais ? 400 : 30).map((e) => {
    const tot = (e.itens || []).reduce((s, it) => s + (it.series || []).length, 0), ok = (e.itens || []).reduce((s, it) => s + (it.series || []).filter((x) => x.ok).length, 0);
    return `<div class="card" style="margin-bottom:10px"><div class="card-head"><div><h3>${esc(e.diaNome || 'Treino')}</h3><div class="small muted">${SEMANA[paraData(e.data).getDay()]}, ${dataBR(e.data)}${e.duracao ? ' · ' + e.duracao + ' min' : ''} · ${ok}/${tot} séries${e.esforco ? ' · esforço ' + e.esforco + '/10' : ''}</div></div>
      <button class="btn sm" onclick="responder('execucoes','${e.id}')">${e.resposta ? 'Editar resposta' : 'Responder'}</button></div>
      ${e.comentario ? `<div class="quote">${esc(e.comentario)}</div>` : ''}${e.resposta ? `<div class="quote prof"><b>Você:</b> ${esc(e.resposta)}</div>` : ''}
      <details style="margin-top:8px"><summary class="small b" style="cursor:pointer">Ver exercícios e cargas</summary><div class="tbl-wrap"><table style="margin-top:6px"><tbody>
      ${(e.itens || []).map((it) => `<tr><td>${esc(exPor(it.exId)?.nome || it.nome || 'Exercício')}</td><td class="small">${(it.series || []).map((s) => `<span class="${s.ok ? '' : 'muted'}" style="${s.ok ? '' : 'text-decoration:line-through'}">${s.carga ? esc(s.carga) + 'kg' : '—'}×${esc(s.reps || '?')}</span>`).join(' · ')}</td></tr>`).join('')}
      </tbody></table></div></details></div>`;
  }).join('') + (es.length > 30 && !VIEW.mais ? `<button class="btn block" onclick="VIEW.mais=1;render()">Ver todos (${es.length})</button>` : '');
}

// ---------- evolução ----------
function abaEvolucao(a) {
  const exs = exerciciosFeitos(a.id), exSel = VIEW.ex && exs.includes(VIEW.ex) ? VIEW.ex : exs[0];
  const hist = exSel ? historicoEx(a.id, exSel) : [];
  const avs = avalsDo(a.id), fs = fotosDo(a.id);
  const topo = exs.slice(0, 8).map((id) => { const h = historicoEx(a.id, id); return { id, h0: h[0], h1: h[h.length - 1], n: h.length }; }).filter((x) => x.n > 1);
  const MED = [['peito', 'Peito'], ['cintura', 'Cintura'], ['abdomen', 'Abdômen'], ['quadril', 'Quadril'], ['bracoD', 'Braço D'], ['bracoE', 'Braço E'], ['coxaD', 'Coxa D'], ['coxaE', 'Coxa E'], ['panturrilha', 'Panturrilha']];
  const medUsadas = MED.filter(([k]) => avs.some((v) => v.medidas && lerNum(v.medidas[k])));
  const datasFoto = [...new Set(fs.map((f) => f.data))];
  return `<div class="grid g2" style="align-items:start">
    <div class="card"><div class="card-head"><h2>Evolução de carga</h2>${exs.length ? `<select class="i" style="max-width:260px" onchange="VIEW.ex=this.value;render()">${exs.map((id) => `<option value="${id}"${id === exSel ? ' selected' : ''}>${esc(exPor(id).nome)}</option>`).join('')}</select>` : ''}</div>
      ${exSel ? `<p class="small muted" style="margin:-4px 0 8px">Maior carga usada em cada treino (kg)</p>${grafico(hist.map((h) => ({ data: h.data, v: h.max, extra: `${h.reps} repetições · ${h.series} séries` })), { unid: 'kg', titulo: 'Carga em ' + exPor(exSel).nome })}` : '<p class="vazio">Aparece quando o aluno registrar treinos com carga.</p>'}
      ${topo.length ? `<h3 style="margin-top:14px">Do primeiro ao último registro</h3><table><tbody>${topo.map((x) => { const d = x.h1.max - x.h0.max, pc = x.h0.max ? Math.round(d / x.h0.max * 100) : 0; return `<tr><td>${esc(exPor(x.id).nome)}</td><td class="r small muted">${num(x.h0.max)} → <b style="color:var(--ink)">${num(x.h1.max)} kg</b></td><td class="r"><span class="pill ${d > 0 ? 'ok' : d < 0 ? 'bad' : ''}">${d > 0 ? '▲ +' : d < 0 ? '▼ ' : ''}${pc}%</span></td></tr>`; }).join('')}</tbody></table>` : ''}</div>
    <div class="card"><h2>Peso corporal</h2><p class="small muted" style="margin:-4px 0 8px">Das avaliações e dos check-ins (kg)</p>${grafico(pesosDo(a.id), { unid: 'kg', titulo: 'Peso corporal' })}</div></div>
    <div class="card" style="margin-top:14px"><div class="card-head"><h2>Avaliações físicas</h2><button class="btn pri sm" onclick="editarAvaliacao('${a.id}')">+ Nova avaliação</button></div>
      ${avs.length ? `<div class="tbl-wrap"><table><thead><tr><th>Data</th><th class="r">Peso</th><th class="r">% gordura</th>${medUsadas.map(([, t]) => `<th class="r">${t}</th>`).join('')}<th></th></tr></thead><tbody>
      ${avs.map((v) => `<tr class="click" onclick="editarAvaliacao('${a.id}','${v.id}')"><td class="nw">${dataBR(v.data)}</td><td class="r">${num(v.peso)}</td><td class="r">${num(v.gordura)}</td>${medUsadas.map(([k]) => `<td class="r">${num(v.medidas?.[k])}</td>`).join('')}<td class="small muted">${v.obs ? '📝' : ''}</td></tr>`).join('')}
      ${avs.length > 1 ? (() => { const n = avs[0], o = avs[avs.length - 1], df = (x, y) => (lerNum(x) != null && lerNum(y) != null ? `${x - y > 0 ? '+' : ''}${num(x - y)}` : '—'); return `<tr><td class="b">Diferença</td><td class="r b">${df(n.peso, o.peso)}</td><td class="r b">${df(n.gordura, o.gordura)}</td>${medUsadas.map(([k]) => `<td class="r b">${df(n.medidas?.[k], o.medidas?.[k])}</td>`).join('')}<td></td></tr>`; })() : ''}
      </tbody></table></div><p class="tiny muted">Medidas em cm. A diferença compara a primeira com a última avaliação.</p>` : '<p class="vazio">Nenhuma avaliação registrada.</p>'}</div>
    <div class="card" style="margin-top:14px"><div class="card-head"><h2>Fotos de evolução</h2><div class="row">${datasFoto.length > 1 ? `<button class="btn sm" onclick="compararFotos('${a.id}')">Comparar antes e depois</button>` : ''}<label class="btn sm pri">+ Adicionar fotos<input type="file" accept="image/*" multiple hidden onchange="enviarFotos(this,'${a.id}')"></label></div></div>
      ${datasFoto.length ? datasFoto.map((d) => `<div class="small b" style="margin:10px 0 6px">${dataBR(d)}</div><div class="fotos">${fs.filter((f) => f.data === d).map((f) => `<div class="foto" onclick="verFoto('${f.id}')"><img src="${f.img}" alt="${esc(f.pose || 'foto')}" loading="lazy"><div class="cap">${esc(f.pose || '')}${f.enviadaPor === 'prof' ? ' · você' : ''}</div></div>`).join('')}</div>`).join('') : '<p class="vazio">Nenhuma foto ainda. O aluno pode enviar pelo app, junto com o check-in.</p>'}</div>`;
}
function editarAvaliacao(alunoId, id) {
  const v = id ? S.avaliacoes.find((x) => x.id === id) : { data: hoje(), medidas: {} }, m = v.medidas || {};
  const cm = (k, t) => campo(t, 'm_' + k, m[k] ?? '', 'number', 'step="0.1" min="0"');
  abrirModal(id ? 'Avaliação de ' + dataBR(v.data) : 'Nova avaliação física', `<div class="fgrid">
    ${campo('Data', 'data', v.data, 'date', 'required')}${campo('Peso (kg)', 'peso', v.peso ?? '', 'number', 'step="0.1" min="20" max="350"')}${campo('% de gordura', 'gordura', v.gordura ?? '', 'number', 'step="0.1" min="2" max="70"')}
    ${campo('Massa magra (kg)', 'magra', v.magra ?? '', 'number', 'step="0.1" min="0"')}
    <div class="full"><h3 style="margin:6px 0 0">Medidas (cm)</h3></div>
    ${cm('peito', 'Peito')}${cm('cintura', 'Cintura')}${cm('abdomen', 'Abdômen')}${cm('quadril', 'Quadril')}${cm('bracoD', 'Braço direito')}${cm('bracoE', 'Braço esquerdo')}${cm('coxaD', 'Coxa direita')}${cm('coxaE', 'Coxa esquerda')}${cm('panturrilha', 'Panturrilha')}
    <div class="full">${areaCampo('Observações', 'obs', v.obs || '', 'rows="2"')}</div></div>`,
  (d) => {
    const x = id ? v : { id: uid('av'), alunoId };
    const medidas = {}; for (const k in d) if (k.startsWith('m_') && lerNum(d[k]) != null) medidas[k.slice(2)] = lerNum(d[k]);
    Object.assign(x, { data: d.data, peso: lerNum(d.peso), gordura: lerNum(d.gordura), magra: lerNum(d.magra), medidas, obs: d.obs });
    if (!id) S.avaliacoes.push(x); salvar(); toast('Avaliação salva');
  }, 'Salvar', { lg: true, extra: id ? `<button type="button" class="btn danger" style="margin-right:auto" onclick="if(confirm('Apagar esta avaliação?')){S.avaliacoes=S.avaliacoes.filter(x=>x.id!=='${id}');salvar();fecharModal();render()}">Apagar</button>` : '' });
}
async function enviarFotos(input, alunoId) {
  const arqs = [...input.files]; if (!arqs.length) return;
  toast('Preparando as fotos…');
  try {
    for (const f of arqs) S.fotos.push({ id: uid('f'), alunoId, data: hoje(), pose: '', img: await lerImagem(f), visto: true, enviadaPor: 'prof' });
    salvar(); render(); toast('Fotos adicionadas');
  } catch (e) { toast(e.message); }
}
function compararFotos(alunoId) {
  const fs = fotosDo(alunoId), datas = [...new Set(fs.map((f) => f.data))].sort();
  const poses = [...new Set(fs.map((f) => f.pose || ''))];
  const desenhar = () => {
    const f = $('#mform'), d1 = f.d1.value, d2 = f.d2.value, p = f.pose.value;
    const pega = (d) => fs.find((x) => x.data === d && (x.pose || '') === p) || fs.find((x) => x.data === d);
    const a = pega(d1), b = pega(d2);
    $('#cmp').innerHTML = `<div><div class="small b">${dataBR(d1)}</div>${a ? `<img src="${a.img}" alt="antes">` : '<p class="vazio">—</p>'}</div><div><div class="small b">${dataBR(d2)}${d1 && d2 ? ` · ${diasEntre(d1, d2)} dias depois` : ''}</div>${b ? `<img src="${b.img}" alt="depois">` : '<p class="vazio">—</p>'}</div>`;
  };
  abrirModal('Comparar fotos', `<div class="fgrid">${selCampo('Antes', 'd1', datas.map((d) => [d, dataBR(d)]), datas[0], 'onchange="window._cmp()"')}${selCampo('Depois', 'd2', datas.map((d) => [d, dataBR(d)]), datas[datas.length - 1], 'onchange="window._cmp()"')}
    ${selCampo('Posição', 'pose', poses.map((p) => [p, p || 'Qualquer']), poses[0], 'onchange="window._cmp()"')}</div><div class="comparar" id="cmp" style="margin-top:12px"></div>`, null, '', { lg: true });
  window._cmp = desenhar; desenhar();
}

// ---------- check-ins ----------
function abaCheckins(a) {
  const cs = checkinsDo(a.id);
  const nota = (v, t) => (v ? `<span class="pill ${v >= 4 ? 'ok' : v <= 2 ? 'bad' : 'warn'}">${t} ${v}/5</span>` : '');
  return `<p class="muted" style="margin:0 0 12px">O check-in é o relatório que o aluno envia pelo app (o ideal é uma vez por semana): peso, sono, alimentação, energia, dores e comentários.</p>
  ${cs.length ? cs.map((c) => `<div class="card" style="margin-bottom:10px"><div class="card-head"><div><h3>${dataBR(c.data)} <span class="small muted">· ${relDias(c.data)}</span></h3></div><button class="btn sm" onclick="responder('checkins','${c.id}')">${c.resposta ? 'Editar resposta' : 'Responder'}</button></div>
    <div class="row" style="gap:6px">${c.peso ? `<span class="pill info">${num(c.peso)} kg</span>` : ''}${nota(c.sono, 'Sono')}${nota(c.alimentacao, 'Alimentação')}${nota(c.energia, 'Energia')}${c.estresse ? `<span class="pill ${c.estresse <= 2 ? 'ok' : c.estresse >= 4 ? 'bad' : 'warn'}">Estresse ${c.estresse}/5</span>` : ''}${c.agua ? `<span class="pill">Água ${esc(c.agua)} L/dia</span>` : ''}</div>
    ${c.dor ? `<div class="quote" style="border-left:3px solid var(--warn)"><b>Dor/desconforto:</b> ${esc(c.dor)}</div>` : ''}${c.comentario ? `<div class="quote">${esc(c.comentario)}</div>` : ''}${c.resposta ? `<div class="quote prof"><b>Você:</b> ${esc(c.resposta)}</div>` : ''}</div>`).join('') : '<div class="card"><p class="vazio">Nenhum check-in enviado ainda.</p></div>'}`;
}

// ---------- financeiro do aluno ----------
function linhaPag(p, comAluno) {
  const a = alunoPor(p.alunoId), h = hoje();
  const st = p.pago ? `<span class="pill ok">Pago ${dataCurta(p.dataPag)}${p.forma ? ' · ' + esc(p.forma) : ''}</span>` : p.venc < h ? '<span class="pill bad">Atrasado</span>' : '<span class="pill warn">Em aberto</span>';
  return `<tr>${comAluno ? `<td><a href="#" onclick="event.preventDefault();ir('aluno',{id:'${a.id}',aba:'financeiro'})">${esc(a.nome)}</a></td>` : `<td class="nw">${esc(mesNome(p.comp))}</td>`}<td class="nw">${dataBR(p.venc)}</td><td class="r">${brl(p.valor)}</td><td>${st}</td>
    <td class="acts nw">${p.pago ? `<button class="btn sm ghost" onclick="desfazerPag('${p.id}')">Desfazer</button>` : `<button class="btn sm" onclick="receber('${p.id}')">Receber</button>${a.whatsapp ? `<a class="btn sm ghost" target="_blank" rel="noopener" href="${esc(waLink(a.whatsapp, textoCobranca(a, p)))}">Cobrar</a>` : ''}`}
    <button class="icon-btn" title="Editar" onclick="editarPag('${p.id}')">✎</button></td></tr>`;
}
function abaFinanceiro(a) {
  const ps = pagsDo(a.id);
  return `<div class="card"><div class="card-head"><div><h2>Mensalidades</h2><div class="small muted">${a.valor ? `${esc(a.plano || 'Plano')} · ${brl(a.valor)} por mês · vence dia ${a.diaVenc}` : 'Sem valor mensal cadastrado (edite os dados do aluno para gerar as cobranças automaticamente).'}</div></div><button class="btn sm" onclick="editarPag(null,'${a.id}')">+ Cobrança avulsa</button></div>
    ${ps.length ? `<div class="tbl-wrap"><table><thead><tr><th>Referente a</th><th>Vencimento</th><th class="r">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${ps.map((p) => linhaPag(p)).join('')}</tbody></table></div>` : '<p class="vazio">Nenhuma cobrança.</p>'}</div>`;
}
function receber(id) {
  const p = S.pagamentos.find((x) => x.id === id);
  abrirModal('Registrar pagamento', `<p style="margin-top:0">${esc(alunoPor(p.alunoId).nome)} · ${esc(mesNome(p.comp))} · <b>${brl(p.valor)}</b></p><div class="fgrid">${campo('Data do pagamento', 'dataPag', hoje(), 'date', 'required')}${selCampo('Forma', 'forma', FORMAS, 'Pix')}</div>`,
    (d) => { Object.assign(p, { pago: true, dataPag: d.dataPag, forma: d.forma }); salvar(); toast('Pagamento registrado'); }, 'Confirmar');
}
function desfazerPag(id) { const p = S.pagamentos.find((x) => x.id === id); if (!confirm('Marcar esta mensalidade como não paga?')) return; Object.assign(p, { pago: false, dataPag: null, forma: '' }); salvar(); render(); }
function editarPag(id, alunoId) {
  const p = id ? S.pagamentos.find((x) => x.id === id) : { alunoId, comp: hoje().slice(0, 7), venc: hoje(), valor: alunoPor(alunoId)?.valor || 0 };
  abrirModal(id ? 'Editar cobrança' : 'Nova cobrança', `<div class="fgrid">${campo('Referente ao mês', 'comp', p.comp, 'month', 'required')}${campo('Vencimento', 'venc', p.venc, 'date', 'required')}${campo('Valor (R$)', 'valor', p.valor, 'number', 'step="0.01" min="0" required')}</div>`,
    (d) => { const x = id ? p : { id: uid('pg'), alunoId, pago: false, dataPag: null, forma: '' }; Object.assign(x, { comp: d.comp, venc: d.venc, valor: lerNum(d.valor) || 0 }); if (!id) S.pagamentos.push(x); salvar(); },
    'Salvar', { extra: id ? `<button type="button" class="btn danger" style="margin-right:auto" onclick="if(confirm('Apagar esta cobrança?')){S.pagamentos=S.pagamentos.filter(x=>x.id!=='${id}');salvar();fecharModal();render()}">Apagar</button>` : '' });
}

// ---------- acesso do aluno ao app ----------
function abaAcesso(a) {
  const link = ONLINE ? location.origin : '(endereço do sistema)';
  if (!ONLINE) return `<div class="card"><h2>Acesso ao app</h2><p>No sistema online, aqui você cria o <b>usuário e a senha</b> do aluno e envia tudo pelo WhatsApp com um toque. Ele entra pelo celular, toca em "Adicionar à tela de início" e usa como um aplicativo.</p>
    <p class="muted">Na demonstração não há senhas: para ver como fica para o aluno, use "Trocar de visão" no menu e entre como ${esc(primeiroNome(a.nome))}.</p></div>`;
  if (!ACESSOS) { api('GET', '/api/acessos').then((r) => { ACESSOS = r; if (VIEW.v === 'aluno' && VIEW.aba === 'acesso') render(); }).catch((e) => toast(e.message)); return '<div class="card"><p class="vazio">Carregando…</p></div>'; }
  const ac = ACESSOS.find((x) => x.alunoId === a.id);
  return `<div class="card"><h2>Acesso ao app</h2>
    ${ac ? `<table><tbody><tr><td class="muted">Usuário</td><td><b>${esc(ac.login)}</b></td></tr><tr><td class="muted">Situação</td><td>${ac.ativo ? '<span class="pill ok">Liberado</span>' : '<span class="pill bad">Bloqueado</span>'}</td></tr>
      <tr><td class="muted">Último acesso</td><td>${ac.ultimoAcesso ? dataBR(ac.ultimoAcesso) + ' às ' + ac.ultimoAcesso.slice(11, 16) : 'ainda não entrou'}</td></tr></tbody></table>
      <div class="row" style="margin-top:12px"><button class="btn" onclick="criarAcesso('${a.id}')">Gerar nova senha</button>
      <button class="btn ${ac.ativo ? 'danger' : ''}" onclick="bloquearAcesso(${ac.id},${ac.ativo ? 0 : 1})">${ac.ativo ? 'Bloquear acesso' : 'Liberar acesso'}</button></div>`
      : `<p>${esc(primeiroNome(a.nome))} ainda não tem acesso. Crie o usuário e a senha e envie pelo WhatsApp. Ele vai entrar em <b>${esc(link)}</b>.</p><button class="btn pri" onclick="criarAcesso('${a.id}')">Criar acesso</button>`}</div>`;
}
const semAcento = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');
function sugerirLogin(nome) { const p = semAcento(nome).toLowerCase().replace(/[^a-z\s]/g, '').trim().split(/\s+/); return (p[0] + (p.length > 1 ? '.' + p[p.length - 1] : '')).slice(0, 30); }
function senhaAleatoria() { const c = 'abcdefghjkmnpqrstuvwxyz23456789'; const b = crypto.getRandomValues(new Uint8Array(8)); return [...b].map((x) => c[x % c.length]).join(''); }
function criarAcesso(alunoId) {
  const a = alunoPor(alunoId), ac = ACESSOS && ACESSOS.find((x) => x.alunoId === alunoId);
  abrirModal(ac ? 'Gerar nova senha' : 'Criar acesso ao app', `<div class="fgrid">${campo('Usuário', 'login', ac ? ac.login : sugerirLogin(a.nome), 'text', 'required autocapitalize="none" pattern="[a-z0-9._\\-]{3,30}" title="De 3 a 30 letras minúsculas, números, ponto ou traço"')}${campo('Senha', 'senha', senhaAleatoria(), 'text', 'required minlength="6"')}</div>
    <p class="small muted">Anote ou envie pelo WhatsApp na próxima tela. ${ac ? 'A senha antiga deixa de funcionar.' : ''}</p>`,
  async (d) => {
    await api('POST', '/api/acessos', { alunoId, nome: a.nome, login: d.login.toLowerCase(), senha: d.senha });
    ACESSOS = await api('GET', '/api/acessos');
    const txt = `Oi, ${primeiroNome(a.nome)}! Seu acesso ao app da ${cfg().nome}:\n\n🔗 ${location.origin}\n👤 Usuário: ${d.login.toLowerCase()}\n🔑 Senha: ${d.senha}\n\nDica: abra o link no celular e toque em "Adicionar à tela de início" para usar como aplicativo. Lá você vê seus treinos, registra as cargas e fala comigo.`;
    setTimeout(() => abrirModal('Acesso pronto', `<p>Envie os dados para ${esc(primeiroNome(a.nome))}:</p><div class="quote">${esc(txt)}</div>`, null, '', { extra: a.whatsapp ? `<a class="btn wa" target="_blank" rel="noopener" href="${esc(waLink(a.whatsapp, txt))}">Enviar pelo WhatsApp</a>` : `<button type="button" class="btn" onclick="navigator.clipboard.writeText(${esc(JSON.stringify(txt))}).then(()=>toast('Copiado'))">Copiar</button>` }), 0);
  }, ac ? 'Gerar' : 'Criar acesso');
}
async function bloquearAcesso(id, ativo) {
  if (!ativo && !confirm('Bloquear o acesso? O aluno sai do app na hora e não consegue entrar até você liberar.')) return;
  try { await api('PUT', '/api/acessos/' + id, { ativo: !!ativo }); ACESSOS = await api('GET', '/api/acessos'); render(); } catch (e) { toast(e.message); }
}

// ---------- modelos de treino ----------
function vModelos() {
  const ms = S.treinos.filter((t) => !t.alunoId).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return `<div class="page-head"><div><h1>Modelos de treino</h1><p class="muted" style="margin:4px 0 0">Treinos prontos para aplicar a vários alunos e só ajustar.</p></div>
    <button class="btn pri" onclick="novoModelo()">+ Novo modelo</button></div>
    ${ms.length ? `<div class="grid g2">${ms.map((t) => `<div class="card"><div class="card-head"><h2>${esc(t.nome)}</h2><span class="pill">${t.dias.length} divisões</span></div>
      <div class="small muted">${t.dias.map((d) => esc(d.nome)).join(' · ')}</div>
      <div class="row" style="margin-top:12px"><button class="btn sm pri" onclick="aplicarModelo('${t.id}')">Aplicar a um aluno</button><button class="btn sm" onclick="abrirEditor('${t.id}')">Editar</button>
      <button class="btn sm ghost danger" onclick="if(confirm('Apagar o modelo?')){S.treinos=S.treinos.filter(x=>x.id!=='${t.id}');salvar();render()}">Apagar</button></div></div>`).join('')}</div>`
      : '<div class="card"><p class="vazio">Nenhum modelo ainda. Crie um aqui ou use "Salvar como modelo" no treino de um aluno.</p></div>'}`;
}
function novoModelo() { VIEW = { v: 'editor', rasc: { id: uid('t'), alunoId: null, nome: 'Novo modelo', ativo: false, dias: [{ id: uid('d'), nome: 'Treino A', itens: [] }] }, volta: { v: 'modelos' } }; render(); }
function aplicarModelo(id) {
  const m = S.treinos.find((t) => t.id === id), al = ativos().sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  if (!al.length) return toast('Cadastre um aluno primeiro.');
  abrirModal('Aplicar "' + m.nome + '"', `<div class="fgrid"><div class="full">${selCampo('Aluno', 'aluno', al.map((a) => [a.id, a.nome]), al[0].id)}</div>${campo('Início', 'inicio', hoje(), 'date')}${campo('Validade até', 'fim', addDias(hoje(), 42), 'date')}</div>
    <p class="small muted">Você vai poder ajustar o treino antes de salvar. O treino atual do aluno fica arquivado.</p>`,
  (d) => {
    const t = JSON.parse(JSON.stringify(m));
    Object.assign(t, { id: uid('t'), alunoId: d.aluno, inicio: d.inicio, fim: d.fim, ativo: true, criadoEm: new Date().toISOString() });
    t.dias.forEach((di) => { di.id = uid('d'); di.itens.forEach((it) => (it.id = uid('i'))); });
    VIEW = { v: 'editor', rasc: t, novo: true, volta: { v: 'aluno', id: d.aluno, aba: 'treinos' } };
  }, 'Continuar');
}

// ---------- biblioteca de exercícios ----------
function vExercicios() {
  const g = VIEW.g || '', q = semAcento((VIEW.q || '').toLowerCase());
  const lista = S.exercicios.filter((e) => (!g || e.grupo === g) && (!q || semAcento(e.nome.toLowerCase()).includes(q))).sort((a, b) => a.grupo.localeCompare(b.grupo) || a.nome.localeCompare(b.nome, 'pt-BR'));
  return `<div class="page-head"><div><h1>Exercícios</h1><p class="muted" style="margin:4px 0 0">${S.exercicios.length} exercícios. Coloque o link do seu vídeo para o aluno ver a execução.</p></div><button class="btn pri" onclick="novoExercicio()">+ Novo exercício</button></div>
    <div class="card"><div class="row" style="margin-bottom:12px"><input class="i" style="max-width:280px" placeholder="Buscar…" value="${esc(VIEW.q || '')}" oninput="VIEW.q=this.value;clearTimeout(window._bq);window._bq=setTimeout(()=>{render();const i=document.querySelector('.card input.i');i.focus();i.setSelectionRange(i.value.length,i.value.length)},250)">
      <select class="i" style="max-width:220px" onchange="VIEW.g=this.value;render()"><option value="">Todos os grupos</option>${GRUPOS.map((x) => `<option${x === g ? ' selected' : ''}>${x}</option>`).join('')}</select></div>
    <div class="tbl-wrap"><table><thead><tr><th>Exercício</th><th>Grupo</th><th>Equipamento</th><th>Vídeo</th></tr></thead><tbody>
    ${lista.map((e) => `<tr class="click" onclick="novoExercicio(false,'${e.id}')"><td class="b">${esc(e.nome)}${e.dica ? `<div class="small muted" style="font-weight:400">${esc(e.dica)}</div>` : ''}</td><td>${esc(e.grupo)}</td><td class="small">${esc(e.equipamento || '')}</td>
      <td>${e.video ? '<span class="pill ok">Seu vídeo</span>' : '<span class="small muted">busca no YouTube</span>'}</td></tr>`).join('') || '<tr><td colspan="4" class="vazio">Nada encontrado.</td></tr>'}</tbody></table></div></div>`;
}
function novoExercicio(doEditor, id) {
  const e = id ? exPor(id) : { grupo: 'Peito', equipamento: '' };
  const usos = id ? S.treinos.filter((t) => t.dias.some((d) => d.itens.some((it) => it.exId === id))).length : 0;
  abrirModal(id ? 'Editar exercício' : 'Novo exercício', `<div class="fgrid"><div class="full">${campo('Nome', 'nome', e.nome, 'text', 'required maxlength="80"')}</div>
    ${selCampo('Grupo muscular', 'grupo', GRUPOS, e.grupo)}${selCampo('Equipamento', 'equipamento', ['', 'Barra', 'Halteres', 'Máquina', 'Polia', 'Peso corporal', 'Elástico', 'Kettlebell', 'Outro'], e.equipamento)}
    <div class="full">${campo('Link do vídeo (YouTube, Instagram, Google Drive…)', 'video', e.video, 'url', 'placeholder="https://"')}</div>
    <div class="full">${areaCampo('Dica de execução (aparece para o aluno)', 'dica', e.dica, 'rows="2"')}</div></div>
    ${usos ? `<p class="small muted">Usado em ${usos} treino(s).</p>` : ''}`,
  (d) => { const x = id ? e : { id: uid('ex') }; Object.assign(x, d); if (!id) S.exercicios.push(x); salvar(); toast(id ? 'Exercício salvo' : 'Exercício cadastrado' + (doEditor ? ': já aparece na lista' : '')); if (doEditor) { fecharModal(); render(); return false; } },
  'Salvar', { extra: id && !usos ? `<button type="button" class="btn danger" style="margin-right:auto" onclick="if(confirm('Apagar este exercício?')){S.exercicios=S.exercicios.filter(x=>x.id!=='${id}');salvar();fecharModal();render()}">Apagar</button>` : '' });
}

// ---------- mensagens ----------
function vMensagens() {
  const lista = S.alunos.filter((a) => a.status !== 'Encerrado' || S.mensagens.some((m) => m.alunoId === a.id)).map((a) => {
    const ms = msgsDo(a.id); return { a, ult: ms[ms.length - 1], n: naoLidasProf(a.id) };
  }).sort((x, y) => (y.ult?.em || '').localeCompare(x.ult?.em || '') || x.a.nome.localeCompare(y.a.nome, 'pt-BR'));
  const sel = VIEW.alunoId && alunoPor(VIEW.alunoId) ? VIEW.alunoId : null;
  if (sel) { marcarLidas(sel); rolarChat(); }
  const estreito = innerWidth < 860;
  const listaHTML = `<div class="card" style="padding:6px 0">${lista.map(({ a, ult, n }) => `<div class="row" style="flex-wrap:nowrap;padding:10px 14px;cursor:pointer;${a.id === sel ? 'background:var(--accent-soft)' : ''}" onclick="VIEW.alunoId='${a.id}';render()">
      <div class="av">${esc(iniciais(a.nome))}</div><div class="grow"><div class="row sp" style="flex-wrap:nowrap"><b class="nw" style="overflow:hidden;text-overflow:ellipsis">${esc(a.nome)}</b><span class="tiny muted nw">${ult ? (ult.em.slice(0, 10) === hoje() ? horaDe(ult.em) : dataCurta(ult.em)) : ''}</span></div>
      <div class="small muted" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${ult ? (ult.de === 'prof' ? 'Você: ' : '') + esc(ult.texto) : 'Sem mensagens'}</div></div>${n ? `<span class="badge">${n}</span>` : ''}</div>`).join('') || '<p class="vazio">Nenhum aluno.</p>'}</div>`;
  const chat = sel ? `<div class="card"><div class="card-head"><div class="row">${estreito ? `<button class="btn ghost sm" onclick="VIEW.alunoId=null;render()">←</button>` : ''}<h2>${esc(alunoPor(sel).nome)}</h2></div><button class="btn sm ghost" onclick="ir('aluno',{id:'${sel}'})">Ver aluno</button></div>${chatHTML(sel)}</div>` : '<div class="card"><p class="vazio">Escolha um aluno para conversar.</p></div>';
  return `<div class="page-head"><h1>Mensagens</h1></div>${estreito ? (sel ? chat : listaHTML) : `<div style="display:grid;grid-template-columns:320px 1fr;gap:14px;align-items:start">${listaHTML}${chat}</div>`}`;
}

// ---------- financeiro geral ----------
function vFinanceiro() {
  gerarMensalidades();
  const comp = VIEW.comp || hoje().slice(0, 7), h = hoje();
  const doMes = S.pagamentos.filter((p) => p.comp === comp && alunoPor(p.alunoId)).sort((a, b) => a.venc.localeCompare(b.venc) || alunoPor(a.alunoId).nome.localeCompare(alunoPor(b.alunoId).nome));
  const soma = (l) => l.reduce((s, p) => s + p.valor, 0);
  const pago = doMes.filter((p) => p.pago), aberto = doMes.filter((p) => !p.pago), atr = aberto.filter((p) => p.venc < h);
  const antes = atrasados().filter((p) => p.comp < comp);
  const mover = (n) => { const [a, m] = comp.split('-').map(Number); const d = new Date(a, m - 1 + n, 1); return `${d.getFullYear()}-${p2(d.getMonth() + 1)}`; };
  return `<div class="page-head"><h1>Financeiro</h1><div class="row"><button class="btn sm" onclick="VIEW.comp='${mover(-1)}';render()">←</button><b style="min-width:150px;text-align:center">${esc(mesNome(comp))}</b><button class="btn sm" onclick="VIEW.comp='${mover(1)}';render()">→</button></div></div>
    <div class="grid g4"><div class="tile"><div class="lbl">Previsto no mês</div><div class="val">${brl(soma(doMes))}</div><div class="sub">${doMes.length} mensalidades</div></div>
      <div class="tile"><div class="lbl">Recebido</div><div class="val" style="color:var(--ok)">${brl(soma(pago))}</div><div class="sub">${pago.length} pagas</div></div>
      <div class="tile"><div class="lbl">Em aberto</div><div class="val">${brl(soma(aberto))}</div><div class="sub">${aberto.length} a receber</div></div>
      <div class="tile"><div class="lbl">Atrasado</div><div class="val" style="color:${atr.length ? 'var(--bad)' : 'inherit'}">${brl(soma(atr))}</div><div class="sub">${atr.length} vencidas</div></div></div>
    <div class="card" style="margin-top:14px"><h2>Mensalidades de ${esc(mesNome(comp))}</h2>
      ${doMes.length ? `<div class="tbl-wrap"><table><thead><tr><th>Aluno</th><th>Vencimento</th><th class="r">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${doMes.map((p) => linhaPag(p, true)).join('')}</tbody></table></div>` : '<p class="vazio">Nenhuma mensalidade neste mês. Elas são criadas sozinhas para os alunos ativos com valor mensal cadastrado.</p>'}</div>
    ${antes.length ? `<div class="card" style="margin-top:14px"><h2>Atrasadas de meses anteriores</h2><div class="tbl-wrap"><table><thead><tr><th>Aluno</th><th>Vencimento</th><th class="r">Valor</th><th>Situação</th><th></th></tr></thead><tbody>${antes.map((p) => linhaPag(p, true)).join('')}</tbody></table></div></div>` : ''}`;
}

// ---------- configurações ----------
function vConfig() {
  const c = cfg();
  return `<div class="page-head"><h1>Configurações</h1></div>
    <div class="grid g2" style="align-items:start"><form class="card" onsubmit="salvarConfig(event)"><h2>Sua consultoria</h2><div class="stack">
      ${campo('Nome da consultoria (aparece no app do aluno)', 'nome', c.nome, 'text', 'required maxlength="60"')}${campo('Seu nome', 'professor', c.professor, 'text', 'required maxlength="60"')}
      ${campo('Seu WhatsApp (os alunos podem chamar pelo app)', 'whatsapp', c.whatsapp, 'tel')}${campo('Chave Pix (aparece nas cobranças e no app)', 'pix', c.pix)}
      <div class="fgrid">${campo('Alertar quando o aluno ficar sem treinar por (dias)', 'diasSemTreino', c.diasSemTreino, 'number', 'min="2" max="30"')}${campo('Check-in atrasado depois de (dias)', 'diasCheckin', c.diasCheckin, 'number', 'min="3" max="31"')}</div>
      <button class="btn pri">Salvar</button></div></form>
    <div class="card"><h2>Conta e dados</h2><div class="stack">
      ${ONLINE ? '<button class="btn block" onclick="trocarSenha()">Trocar minha senha</button>' : ''}
      <button class="btn block" onclick="exportar()">Baixar uma cópia de todos os dados</button>
      ${ONLINE ? '<p class="small muted">O servidor também faz um backup automático por dia.</p><button class="btn block" onclick="sair()">Sair</button>' : '<button class="btn block danger" onclick="reiniciarDemo()">Recomeçar a demonstração do zero</button>'}</div></div></div>`;
}
function salvarConfig(e) {
  e.preventDefault(); const d = dadosForm(e.target);
  let x = S.config.find((c) => c.id === 'geral'); if (!x) { x = { id: 'geral' }; S.config.push(x); }
  Object.assign(x, d, { diasSemTreino: Number(d.diasSemTreino) || 5, diasCheckin: Number(d.diasCheckin) || 7 }); salvar(); toast('Configurações salvas'); render();
}
function exportar() {
  const blob = new Blob([JSON.stringify(S, null, 1)], { type: 'application/json' });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `consultoria-${hoje()}.json`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
