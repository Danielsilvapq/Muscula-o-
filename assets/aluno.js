// Consultoria de musculação — app do ALUNO (feito para o celular)
'use strict';
const RUN_KEY = () => 'consultoria-run-' + U.alunoId;
let RUN = null, TIMER = null;
function lerRun() { try { const r = JSON.parse(localStorage.getItem(RUN_KEY())); return r && r.itens ? r : null; } catch (e) { return null; } }
function gravarRun() { try { if (RUN) localStorage.setItem(RUN_KEY(), JSON.stringify(RUN)); else localStorage.removeItem(RUN_KEY()); } catch (e) {} }

function telaAluno() {
  const a = alunoPor(U.alunoId);
  if (!a) return `<div class="login"><div class="card"><h2>Seu cadastro ainda não está pronto</h2><p class="muted">Fale com o seu professor.</p><button class="btn block" onclick="sair()">Sair</button></div></div>`;
  if (RUN === null) RUN = lerRun() || false;
  const v = VIEW.v;
  const nMsg = S.mensagens.filter((m) => m.alunoId === a.id && m.de === 'prof' && !m.lida).length;
  const telas = { inicio: alInicio, exec: alExec, evolucao: alEvolucao, checkin: alCheckin, mensagens: alMensagens, perfil: alPerfil };
  const corpo = (telas[v] || alInicio)(a);
  const nav = [['inicio', '🏋', 'Treino'], ['evolucao', '📈', 'Evolução'], ['checkin', '✓', 'Check-in'], ['mensagens', '💬', 'Mensagens', nMsg], ['perfil', '👤', 'Perfil']];
  return `<div class="app-aluno">${corpo}</div>
    <nav class="bnav"><div class="in">${nav.map(([k, ic, t, n]) => `<button class="${(v === k || (v === 'exec' && k === 'inicio')) ? 'on' : ''}" onclick="${v === 'exec' && k !== 'inicio' ? `irDoTreino('${k}')` : `ir('${k}')`}"><span class="ic">${ic}</span>${t}${n ? `<span class="badge">${n}</span>` : ''}</button>`).join('')}</div></nav>`;
}
function irDoTreino(k) { ir(k); toast('Seu treino continua salvo. Volte em "Treino" para terminar.'); }
function topo(titulo, sub) {
  const c = cfg();
  return `<div class="al-top"><div class="brand" style="padding:0"><div class="logo">${esc(iniciais(c.nome))}</div></div><div class="grow"><h1 style="font-size:21px">${titulo}</h1>${sub ? `<div class="small muted">${sub}</div>` : ''}</div></div>`;
}
function proximoDia(a, t) {
  const ult = S.execucoes.filter((e) => e.alunoId === a.id && e.treinoId === t.id).sort(porData)[0];
  if (!ult) return t.dias[0];
  const i = t.dias.findIndex((d) => d.id === ult.diaId);
  return t.dias[(i + 1) % t.dias.length] || t.dias[0];
}

// ---------- início: treino do dia ----------
function alInicio(a) {
  const t = treinoAtivo(a.id), c = cfg();
  const seg = semanaDe(hoje()), nSem = S.execucoes.filter((e) => e.alunoId === a.id && e.data >= seg).length, meta = Number(a.diasSemana) || 3;
  const recados = [...S.execucoes, ...S.checkins].filter((x) => x.alunoId === a.id && x.resposta && x.respondidoEm && diasEntre(x.respondidoEm.slice(0, 10), hoje()) <= 7).sort((x, y) => y.respondidoEm.localeCompare(x.respondidoEm)).slice(0, 2);
  const hojeFeito = S.execucoes.find((e) => e.alunoId === a.id && e.data === hoje());
  let html = topo(`Oi, ${esc(primeiroNome(a.nome))}! 💪`, esc(c.nome));
  if (RUN) {
    const d = t && t.id === RUN.treinoId ? t.dias.find((x) => x.id === RUN.diaId) : null;
    html += `<div class="card" style="border-color:var(--accent);margin-bottom:12px"><div class="row sp"><div><div class="b">Treino em andamento</div><div class="small muted">${esc(d ? d.nome : RUN.diaNome)} · começou às ${horaDe(RUN.inicio)}</div></div><button class="btn pri" onclick="ir('exec')">Continuar</button></div></div>`;
  }
  html += `<div class="card" style="margin-bottom:12px"><div class="row sp"><div class="b">Esta semana</div><div class="small"><b>${nSem}</b> de ${meta} treinos</div></div><div class="progress" style="margin-top:8px"><i style="width:${Math.min(100, nSem / meta * 100)}%"></i></div>
    ${hojeFeito ? `<div class="small" style="margin-top:8px;color:var(--ok)">✓ Treino de hoje concluído. Mandou bem!</div>` : ''}</div>`;
  for (const r of recados) html += `<div class="card" style="margin-bottom:12px;background:var(--accent-soft);border-color:var(--accent-line)"><div class="small b">Recado do professor sobre ${r.diaNome ? esc(r.diaNome) : 'o check-in'} de ${dataCurta(r.data)}</div><div style="margin-top:4px;white-space:pre-wrap">${esc(r.resposta)}</div></div>`;
  if (!t) return html + `<div class="card"><h2>Seu treino está sendo preparado</h2><p class="muted">Assim que o professor liberar, ele aparece aqui. Enquanto isso, você pode mandar uma mensagem ou fazer seu check-in.</p></div>`;
  const prox = proximoDia(a, t);
  html += `<div class="row sp" style="margin:18px 0 8px"><h2>${esc(t.nome)}</h2>${t.fim ? `<span class="small muted">até ${dataCurta(t.fim)}</span>` : ''}</div>
    ${t.obs ? `<div class="quote" style="margin-bottom:10px">${esc(t.obs)}</div>` : ''}
    ${a.restricoes ? `<div class="quote" style="border-left:3px solid var(--warn);margin-bottom:10px"><b>Atenção:</b> ${esc(a.restricoes)}</div>` : ''}
    <div class="stack">${t.dias.map((d, i) => {
      const ult = S.execucoes.filter((e) => e.alunoId === a.id && e.diaId === d.id).sort(porData)[0];
      const letra = (/treino\s+([a-z])\b/i.exec(d.nome) || [])[1] || String.fromCharCode(65 + i);
      return `<div class="card treino-card${d.id === prox.id && !RUN ? ' sug' : ''}" onclick="abrirDia('${t.id}','${d.id}')"><div class="letra">${esc(letra.toUpperCase())}</div>
        <div class="grow"><div class="b">${esc(d.nome)}</div><div class="small muted">${d.itens.length} exercícios · ${ult ? 'último ' + relDias(ult.data) : 'ainda não feito'}</div>${d.id === prox.id && !RUN ? '<span class="pill acc" style="margin-top:6px">Próximo</span>' : ''}</div><span class="muted">›</span></div>`;
    }).join('')}</div>`;
  return html;
}
function abrirDia(tid, did) {
  const t = S.treinos.find((x) => x.id === tid), d = t.dias.find((x) => x.id === did);
  if (RUN && RUN.diaId === did) return ir('exec');
  const lista = d.itens.map((it, i) => { const ex = exPor(it.exId); return `<li style="margin-bottom:6px"><b>${esc(ex ? ex.nome : 'Exercício')}</b><div class="small muted">${esc(it.series || '?')} × ${esc(it.reps || '?')}${it.carga ? ' · ' + esc(it.carga) : ''}${it.descanso ? ' · descanso ' + esc(it.descanso) : ''}${it.metodo && it.metodo !== 'Normal' ? ' · ' + esc(it.metodo) : ''}</div></li>`; }).join('');
  abrirModal(d.nome, `<ol style="padding-left:20px;margin:0">${lista}</ol>${RUN ? '<p class="small" style="color:var(--warn)">Você tem outro treino em andamento. Começar este descarta o outro.</p>' : ''}`,
    () => { comecarTreino(t, d); }, 'Começar treino');
}
function ultimaSerie(alunoId, exId) {
  const e = execsDo(alunoId).find((x) => (x.itens || []).some((it) => it.exId === exId && (it.series || []).some((s) => s.ok)));
  return e ? e.itens.find((it) => it.exId === exId).series.filter((s) => s.ok) : null;
}
function comecarTreino(t, d) {
  RUN = { treinoId: t.id, diaId: d.id, diaNome: d.nome, inicio: new Date().toISOString(), itens: d.itens.map((it) => {
    const n = Math.max(1, Math.min(12, parseInt(it.series, 10) || 3)), ult = ultimaSerie(U.alunoId, it.exId);
    const cargaPresc = lerNum((String(it.carga || '').match(/[\d.,]+/) || [''])[0]);
    return { itemId: it.id, exId: it.exId, series: Array.from({ length: n }, (_, k) => ({ carga: ult && ult[Math.min(k, ult.length - 1)] ? ult[Math.min(k, ult.length - 1)].carga : (cargaPresc ?? ''), reps: ult && ult[Math.min(k, ult.length - 1)] ? ult[Math.min(k, ult.length - 1)].reps : '', ok: false })) };
  }) };
  gravarRun(); VIEW = { v: 'exec' };
}

// ---------- treino em andamento ----------
function alExec(a) {
  if (!RUN) { VIEW = { v: 'inicio' }; return alInicio(a); }
  EM_EDICAO = () => VIEW.v === 'exec';
  const t = S.treinos.find((x) => x.id === RUN.treinoId), d = t && t.dias.find((x) => x.id === RUN.diaId);
  const tot = RUN.itens.reduce((s, it) => s + it.series.length, 0), ok = RUN.itens.reduce((s, it) => s + it.series.filter((x) => x.ok).length, 0);
  const min = Math.round((Date.now() - new Date(RUN.inicio)) / 60000);
  return `<div class="sticky-top"><div class="row sp" style="flex-wrap:nowrap"><div class="grow"><div class="b" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(RUN.diaNome)}</div><div class="small muted">${min} min · ${ok}/${tot} séries</div></div>
      <button class="btn pri" onclick="finalizarTreino()">Finalizar</button></div><div class="progress" style="margin-top:8px"><i style="width:${tot ? ok / tot * 100 : 0}%"></i></div></div>
    ${RUN.itens.map((r, i) => {
      const it = d && d.itens.find((x) => x.id === r.itemId) || {}, ex = exPor(r.exId) || { nome: 'Exercício' };
      const ult = ultimaSerie(a.id, r.exId), feito = r.series.every((s) => s.ok);
      return `<div class="card exec-ex${feito ? ' feito' : ''}"><div class="hd"><div class="n">${feito ? '✓' : i + 1}</div><div class="grow">
        <div class="b">${esc(ex.nome)}</div>
        <div class="small muted">${esc(it.series || r.series.length)} × ${esc(it.reps || '?')}${it.carga ? ' · ' + esc(it.carga) : ''}${it.descanso ? ' · descanso ' + esc(it.descanso) : ''}</div>
        ${it.metodo && it.metodo !== 'Normal' ? `<span class="pill acc" style="margin-top:4px">${esc(it.metodo)}</span>` : ''}
        ${it.obs ? `<div class="quote small">${esc(it.obs)}</div>` : ''}${ex.dica ? `<div class="small muted" style="margin-top:4px">💡 ${esc(ex.dica)}</div>` : ''}
        <div class="row small" style="margin-top:6px"><a href="${esc(videoLink(ex))}" target="_blank" rel="noopener">▶ Ver execução</a>${ult ? `<span class="muted">Última vez: ${ult.map((s) => `${num(lerNum(s.carga) || 0)}×${esc(s.reps || '?')}`).join(' · ')}</span>` : ''}</div></div></div>
        <div class="series"><div class="serie-h"><span>Série</span><span>Carga (kg)</span><span>Repetições</span><span></span></div>
        ${r.series.map((s, k) => `<div class="serie${s.ok ? ' ok' : ''}"><span class="sn">${k + 1}</span>
          <input class="i" inputmode="decimal" value="${esc(s.carga ?? '')}" oninput="runSet(${i},${k},'carga',this.value)" aria-label="Carga da série ${k + 1}">
          <input class="i" inputmode="numeric" value="${esc(s.reps ?? '')}" placeholder="${esc(it.reps || '')}" oninput="runSet(${i},${k},'reps',this.value)" aria-label="Repetições da série ${k + 1}">
          <button class="ck" onclick="runCheck(${i},${k})" aria-label="Série ${k + 1} feita">✓</button></div>`).join('')}</div>
        <div class="row" style="margin-top:8px"><button class="btn sm ghost" onclick="runSerie(${i},1)">+ série</button>${r.series.length > 1 ? `<button class="btn sm ghost" onclick="runSerie(${i},-1)">− série</button>` : ''}</div></div>`;
    }).join('')}
    <div class="stack" style="margin-top:16px"><button class="btn pri block" onclick="finalizarTreino()">Finalizar treino</button><button class="btn ghost block danger" onclick="descartarTreino()">Descartar este treino</button></div>`;
}
function runSet(i, k, campo, v) { RUN.itens[i].series[k][campo] = v.replace(',', '.').slice(0, 10); gravarRun(); }
function runSerie(i, d) {
  const ss = RUN.itens[i].series;
  if (d > 0) { const u = ss[ss.length - 1]; ss.push({ carga: u ? u.carga : '', reps: u ? u.reps : '', ok: false }); } else ss.pop();
  gravarRun(); render();
}
function runCheck(i, k) {
  const r = RUN.itens[i], s = r.series[k]; s.ok = !s.ok;
  if (s.ok && !s.reps) { const t = S.treinos.find((x) => x.id === RUN.treinoId), it = t && t.dias.find((x) => x.id === RUN.diaId)?.itens.find((x) => x.id === r.itemId); const m = /\d+/.exec(it ? it.reps || '' : ''); if (m) s.reps = m[0]; }
  if (s.ok && k + 1 < r.series.length && !r.series[k + 1].carga && s.carga) r.series[k + 1].carga = s.carga;
  gravarRun();
  if (s.ok) {
    const t = S.treinos.find((x) => x.id === RUN.treinoId), it = t && t.dias.find((x) => x.id === RUN.diaId)?.itens.find((x) => x.id === r.itemId);
    const seg = lerSegundos(it && it.descanso) || 60;
    const ultimaDoTreino = RUN.itens.every((x) => x.series.every((y) => y.ok));
    if (!ultimaDoTreino) iniciarTimer(seg);
  }
  const y = scrollY; render(); scrollTo(0, y);
}
function finalizarTreino() {
  const ok = RUN.itens.reduce((s, it) => s + it.series.filter((x) => x.ok).length, 0), tot = RUN.itens.reduce((s, it) => s + it.series.length, 0);
  abrirModal('Finalizar treino', `${ok < tot ? `<p class="small" style="margin-top:0;color:var(--warn)">Você marcou ${ok} de ${tot} séries. As não marcadas ficam registradas como não feitas.</p>` : '<p style="margin-top:0">Treino completo! 🎉</p>'}
    <label class="f"><span>Quão pesado foi o treino? (1 = muito leve, 10 = máximo)</span></label>${escala('esforco', '', 10)}
    <div style="margin-top:14px">${areaCampo('Comentário para o professor (opcional)', 'comentario', '', 'rows="3" placeholder="Ex.: senti o ombro no desenvolvimento; dá para subir a carga no leg"')}</div>`,
  (d) => {
    if (!ok) throw new Error('Marque pelo menos uma série feita (toque no ✓).');
    const fim = new Date();
    S.execucoes.push({ id: uid('e'), alunoId: U.alunoId, treinoId: RUN.treinoId, diaId: RUN.diaId, diaNome: RUN.diaNome, data: hoje(), inicio: RUN.inicio, fim: fim.toISOString(),
      duracao: Math.max(1, Math.round((fim - new Date(RUN.inicio)) / 60000)), esforco: Number(d.esforco) || null, comentario: d.comentario.slice(0, 2000), visto: false,
      itens: RUN.itens.map((r) => ({ exId: r.exId, nome: exPor(r.exId)?.nome || '', series: r.series.map((s) => ({ carga: s.carga === '' ? '' : String(s.carga), reps: String(s.reps ?? ''), ok: !!s.ok })) })) });
    RUN = false; gravarRun(); pararTimer(); salvar(); VIEW = { v: 'inicio' }; toast('Treino registrado! O professor já pode ver. 💪');
  }, 'Salvar treino');
}
function descartarTreino() { if (!confirm('Descartar este treino? Nada do que você marcou será salvo.')) return; RUN = false; gravarRun(); pararTimer(); ir('inicio'); }

// ---------- cronômetro de descanso ----------
let timerInt = null;
function iniciarTimer(seg) { TIMER = { fim: Date.now() + seg * 1000, total: seg, avisou: false }; clearInterval(timerInt); timerInt = setInterval(tickTimer, 250); tickTimer(); }
function pararTimer() { TIMER = null; clearInterval(timerInt); const t = $('#timer'); if (t) t.remove(); }
function ajustarTimer(s) { if (!TIMER) return; TIMER.fim += s * 1000; TIMER.avisou = false; tickTimer(); }
function timerHTML() { return `<div class="timer" id="timer" role="timer"><span class="small">Descanso</span><span class="t" id="timer_t"></span><button onclick="ajustarTimer(-15)">−15</button><button onclick="ajustarTimer(15)">+15</button><button onclick="pararTimer()">Pular</button></div>`; }
function tickTimer() {
  if (!TIMER) return;
  let el = $('#timer'); if (!el) { document.body.insertAdjacentHTML('beforeend', timerHTML()); el = $('#timer'); }
  const r = Math.round((TIMER.fim - Date.now()) / 1000);
  $('#timer_t').textContent = r >= 0 ? `${Math.floor(r / 60)}:${p2(r % 60)}` : 'Bora!';
  el.classList.toggle('fim', r < 0);
  if (r < 0 && !TIMER.avisou) { TIMER.avisou = true; try { navigator.vibrate && navigator.vibrate([200, 100, 200]); } catch (e) {} bip(); }
  if (r < -20) pararTimer();
}
function bip() { try { const c = new (window.AudioContext || window.webkitAudioContext)(), o = c.createOscillator(), g = c.createGain(); o.frequency.value = 880; g.gain.value = 0.15; o.connect(g); g.connect(c.destination); o.start(); o.stop(c.currentTime + 0.35); setTimeout(() => c.close(), 600); } catch (e) {} }

// ---------- evolução ----------
function alEvolucao(a) {
  const es = execsDo(a.id), exs = exerciciosFeitos(a.id), exSel = VIEW.ex && exs.includes(VIEW.ex) ? VIEW.ex : exs[0];
  const avs = avalsDo(a.id), fs = fotosDo(a.id);
  const mes = hoje().slice(0, 7), nMes = es.filter((e) => e.data.startsWith(mes)).length;
  const hist = exSel ? historicoEx(a.id, exSel) : [];
  return topo('Sua evolução') + `<div class="grid" style="grid-template-columns:1fr 1fr">
      <div class="tile"><div class="lbl">Treinos no mês</div><div class="val">${nMes}</div></div><div class="tile"><div class="lbl">Total de treinos</div><div class="val">${es.length}</div></div></div>
    <div class="card" style="margin-top:12px"><h2>Cargas</h2>${exs.length ? `<select class="i" style="margin-bottom:8px" onchange="VIEW.ex=this.value;render()">${exs.map((id) => `<option value="${id}"${id === exSel ? ' selected' : ''}>${esc(exPor(id).nome)}</option>`).join('')}</select>
      ${grafico(hist.map((h) => ({ data: h.data, v: h.max, extra: `${h.reps} repetições` })), { unid: 'kg', titulo: 'Maior carga por treino' })}` : '<p class="vazio">Registre seus treinos com as cargas para ver sua evolução aqui.</p>'}</div>
    <div class="card" style="margin-top:12px"><h2>Peso corporal</h2>${grafico(pesosDo(a.id), { unid: 'kg', titulo: 'Peso corporal' })}</div>
    ${avs.length ? `<div class="card" style="margin-top:12px"><h2>Avaliações físicas</h2><table><thead><tr><th>Data</th><th class="r">Peso</th><th class="r">% gordura</th><th class="r">Cintura</th></tr></thead><tbody>${avs.map((v) => `<tr><td>${dataBR(v.data)}</td><td class="r">${num(v.peso)}</td><td class="r">${num(v.gordura)}</td><td class="r">${num(v.medidas?.cintura)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    ${fs.length ? `<div class="card" style="margin-top:12px"><h2>Suas fotos</h2><div class="fotos">${fs.map((f) => `<div class="foto" onclick="verFoto('${f.id}')"><img src="${f.img}" alt="${esc(f.pose || 'foto')}" loading="lazy"><div class="cap">${dataCurta(f.data)} ${esc(f.pose || '')}</div></div>`).join('')}</div></div>` : ''}
    <div class="card" style="margin-top:12px"><h2>Histórico de treinos</h2>${es.length ? `<div class="feed">${es.slice(0, VIEW.mais ? 300 : 15).map((e) => `<div class="it"><div class="ct"><div class="row sp"><b>${esc(e.diaNome || 'Treino')}</b><span class="small muted">${dataBR(e.data)}</span></div>
      <div class="small muted">${e.duracao ? e.duracao + ' min · ' : ''}${(e.itens || []).reduce((s, it) => s + it.series.filter((x) => x.ok).length, 0)} séries${e.esforco ? ' · esforço ' + e.esforco + '/10' : ''}</div>
      ${e.comentario ? `<div class="quote">${esc(e.comentario)}</div>` : ''}${e.resposta ? `<div class="quote prof"><b>Professor:</b> ${esc(e.resposta)}</div>` : ''}</div></div>`).join('')}</div>${es.length > 15 && !VIEW.mais ? '<button class="btn block" onclick="VIEW.mais=1;render()">Ver todos</button>' : ''}` : '<p class="vazio">Nenhum treino registrado ainda.</p>'}</div>`;
}

// ---------- check-in ----------
function alCheckin(a) {
  const cs = checkinsDo(a.id), ult = cs[0], recente = ult && diasEntre(ult.data, hoje()) < 3;
  const R = ['Muito ruim', 'Ruim', 'Regular', 'Bom', 'Ótimo'];
  return topo('Check-in', 'Conte para o professor como foi a sua semana') +
    `${recente && !VIEW.novoCk ? `<div class="card"><h2>✓ Check-in enviado ${relDias(ult.data)}</h2><p class="muted">O professor vai analisar e responder por aqui.</p><button class="btn block" onclick="VIEW.novoCk=1;render()">Enviar outro check-in</button></div>` :
    `<form class="card stack" onsubmit="enviarCheckin(event)">
      ${campo('Seu peso hoje (kg)', 'peso', '', 'number', 'step="0.1" min="20" max="350" inputmode="decimal" placeholder="Ex.: 72,5"')}
      <div><label class="f"><span>Sono</span></label>${escala('sono', '', 5, R)}</div>
      <div><label class="f"><span>Alimentação / dieta</span></label>${escala('alimentacao', '', 5, R)}</div>
      <div><label class="f"><span>Energia nos treinos</span></label>${escala('energia', '', 5, R)}</div>
      <div><label class="f"><span>Estresse (1 = tranquilo, 5 = muito estressado)</span></label>${escala('estresse', '', 5)}</div>
      ${campo('Água por dia (litros)', 'agua', '', 'number', 'step="0.5" min="0" max="10" inputmode="decimal"')}
      ${areaCampo('Alguma dor ou desconforto?', 'dor', '', 'rows="2" placeholder="Deixe em branco se não teve"')}
      ${areaCampo('Como foi a semana? Dúvidas, dificuldades, conquistas…', 'comentario', '', 'rows="3"')}
      <div><label class="f"><span>Fotos de evolução (opcional): frente, lado e costas</span></label>
        <div class="grid" style="grid-template-columns:repeat(3,1fr);gap:8px">${['Frente', 'Lado', 'Costas'].map((p) => `<label class="foto" style="display:grid;place-items:center;cursor:pointer" id="ck_${p}"><span class="small muted">+ ${p}</span><input type="file" accept="image/*" hidden onchange="previaFoto(this,'${p}')"></label>`).join('')}</div></div>
      <button class="btn pri block">Enviar check-in</button></form>`}
    ${cs.length ? `<h2 style="margin:20px 0 8px">Anteriores</h2>${cs.slice(0, 10).map((c) => `<div class="card" style="margin-bottom:10px"><div class="row sp"><b>${dataBR(c.data)}</b>${c.peso ? `<span class="pill info">${num(c.peso)} kg</span>` : ''}</div>
      ${c.comentario ? `<div class="quote">${esc(c.comentario)}</div>` : ''}${c.resposta ? `<div class="quote prof"><b>Professor:</b> ${esc(c.resposta)}</div>` : '<div class="small muted" style="margin-top:6px">Aguardando resposta</div>'}</div>`).join('')}` : ''}`;
}
const FOTOS_CK = {};
async function previaFoto(input, pose) {
  const f = input.files[0]; if (!f) return;
  try { const img = await lerImagem(f); FOTOS_CK[pose] = img; const l = $('#ck_' + pose); $$('img,span', l).forEach((x) => x.remove()); l.insertAdjacentHTML('afterbegin', `<img src="${img}" alt="${pose}"><div class="cap">${pose}</div>`); }
  catch (e) { toast(e.message); }
}
function enviarCheckin(e) {
  e.preventDefault(); const d = dadosForm(e.target);
  if (!d.peso && !d.sono && !d.alimentacao && !d.energia && !d.comentario && !d.dor && !Object.keys(FOTOS_CK).length) return toast('Preencha pelo menos um item do check-in.');
  const data = hoje();
  S.checkins.push({ id: uid('c'), alunoId: U.alunoId, data, em: new Date().toISOString(), peso: lerNum(d.peso), sono: Number(d.sono) || null, alimentacao: Number(d.alimentacao) || null,
    energia: Number(d.energia) || null, estresse: Number(d.estresse) || null, agua: d.agua || '', dor: d.dor.slice(0, 1000), comentario: d.comentario.slice(0, 3000), visto: false });
  for (const [pose, img] of Object.entries(FOTOS_CK)) { S.fotos.push({ id: uid('f'), alunoId: U.alunoId, data, pose, img, visto: false }); delete FOTOS_CK[pose]; }
  salvar(); VIEW = { v: 'checkin' }; render(); scrollTo(0, 0); toast('Check-in enviado! ✓');
}

// ---------- mensagens ----------
function alMensagens(a) {
  marcarLidas(a.id); rolarChat();
  const c = cfg();
  return topo('Mensagens', 'Fale com ' + esc(c.professor)) + `<div class="card">${chatHTML(a.id)}</div>
    ${c.whatsapp ? `<a class="btn wa block" style="margin-top:12px" target="_blank" rel="noopener" href="${esc(waLink(c.whatsapp, 'Oi, ' + primeiroNome(c.professor) + '! Aqui é ' + primeiroNome(a.nome) + '. '))}">Chamar no WhatsApp</a>` : ''}`;
}

// ---------- perfil ----------
function alPerfil(a) {
  const c = cfg(), ps = pagsDo(a.id).slice(0, 6), h = hoje();
  return topo(esc(a.nome), esc(a.objetivo || '')) + `<div class="card"><table><tbody>
      <tr><td class="muted">Plano</td><td>${esc(a.plano || '—')}${a.valor ? ' · ' + brl(a.valor) : ''}</td></tr>
      <tr><td class="muted">Modalidade</td><td>${esc(a.modalidade || '—')}</td></tr>
      <tr><td class="muted">Meta</td><td>${a.diasSemana || 3} treinos por semana</td></tr>
      <tr><td class="muted">Início</td><td>${dataBR(a.inicio)}</td></tr></tbody></table>
      ${a.restricoes ? `<div class="quote" style="border-left:3px solid var(--warn)"><b>Limitações:</b> ${esc(a.restricoes)}</div>` : ''}</div>
    ${ps.length ? `<div class="card" style="margin-top:12px"><h2>Mensalidades</h2><table><tbody>${ps.map((p) => `<tr><td>${esc(mesNome(p.comp))}<div class="small muted">vence ${dataBR(p.venc)}</div></td><td class="r">${brl(p.valor)}</td><td class="r">${p.pago ? '<span class="pill ok">Pago</span>' : p.venc < h ? '<span class="pill bad">Atrasado</span>' : '<span class="pill warn">Em aberto</span>'}</td></tr>`).join('')}</tbody></table>
      ${c.pix && ps.some((p) => !p.pago) ? `<div class="quote" style="margin-top:10px">Chave Pix: <b>${esc(c.pix)}</b> <button class="btn sm" onclick="navigator.clipboard.writeText(${esc(JSON.stringify(c.pix))}).then(()=>toast('Chave Pix copiada'))">Copiar</button></div>` : ''}</div>` : ''}
    <div class="stack" style="margin-top:12px">${ONLINE ? '<button class="btn block" onclick="trocarSenha()">Trocar minha senha</button><button class="btn block" onclick="sair()">Sair</button>' : '<button class="btn block" onclick="sair()">Trocar de visão (demonstração)</button>'}
    <p class="small muted" style="text-align:center">Dica: no celular, use "Adicionar à tela de início" no menu do navegador para abrir como um aplicativo.</p></div>`;
}
