// Dados fictícios da demonstração (só usados quando o index.html é aberto direto, sem o servidor)
'use strict';
function seedDemo() {
  let semente = 20261119;
  const rnd = () => { semente |= 0; semente = (semente + 0x6D2B79F5) | 0; let t = Math.imul(semente ^ (semente >>> 15), 1 | semente); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const S = vazio(), h = hoje();
  S.config.push({ ...CFG_PADRAO, nome: 'Consultoria Fitness', professor: 'Prof. Rafael Moura', whatsapp: '92999990000', pix: 'pix@consultoriafitness.com.br' });
  S.exercicios = exerciciosIniciais();
  const ex = (nome) => S.exercicios.find((e) => e.nome === nome).id;
  const item = (nome, series, reps, descanso = '60s', metodo = 'Normal', obs = '') => ({ id: uid('i'), exId: ex(nome), series: String(series), reps, carga: '', descanso, metodo, obs });
  const dia = (nome, itens) => ({ id: uid('d'), nome, itens });
  const modelos = {
    abc: { nome: 'Hipertrofia ABC', dias: [
      dia('Treino A — Peito, ombro e tríceps', [item('Supino reto com barra', 4, '8-10', '90s'), item('Supino inclinado com halteres', 3, '10-12', '75s'), item('Crossover polia alta', 3, '12-15'), item('Desenvolvimento com halteres', 3, '10-12', '75s'), item('Elevação lateral', 4, '12-15', '45s', 'Drop-set', 'Drop-set na última série'), item('Tríceps corda', 3, '12-15'), item('Tríceps francês', 3, '10-12')]),
      dia('Treino B — Costas e bíceps', [item('Puxada frontal aberta', 4, '8-10', '90s'), item('Remada curvada com barra', 4, '8-10', '90s'), item('Remada unilateral (serrote)', 3, '10-12'), item('Pulldown com corda', 3, '12-15'), item('Rosca direta barra W', 3, '10-12'), item('Rosca martelo', 3, '12'), item('Face pull', 3, '15', '45s')]),
      dia('Treino C — Pernas', [item('Agachamento livre', 4, '8-10', '2 min', 'Normal', 'Descer até a coxa ficar paralela ao chão'), item('Leg press 45°', 4, '10-12', '90s'), item('Cadeira extensora', 3, '12-15', '60s', 'Rest-pause'), item('Stiff', 4, '10-12', '90s'), item('Mesa flexora', 3, '12-15'), item('Elevação pélvica (hip thrust)', 3, '10-12', '75s'), item('Panturrilha em pé', 4, '15-20', '45s')]),
    ] },
    full: { nome: 'Emagrecimento Full Body AB', dias: [
      dia('Treino A — Corpo todo', [item('Agachamento goblet', 3, '15', '45s'), item('Supino reto com halteres', 3, '12-15', '45s'), item('Remada baixa com triângulo', 3, '12-15', '45s'), item('Afundo (passada)', 3, '12 cada perna', '45s'), item('Desenvolvimento máquina', 3, '15', '45s'), item('Prancha', 3, '40s', '30s'), item('Bicicleta ergométrica', 1, '20 min', '', 'Normal', 'Intervalado: 1 min forte / 1 min leve')]),
      dia('Treino B — Corpo todo', [item('Leg press 45°', 3, '15', '45s'), item('Puxada frontal aberta', 3, '12-15', '45s'), item('Peck deck (voador)', 3, '15', '45s'), item('Mesa flexora', 3, '15', '45s'), item('Elevação lateral', 3, '15', '30s'), item('Abdominal supra', 3, '20', '30s'), item('Esteira', 1, '25 min', '', 'Normal', 'Caminhada inclinada')]),
    ] },
    ini: { nome: 'Iniciante — Adaptação', dias: [
      dia('Treino A — Superiores', [item('Supino máquina', 3, '12-15'), item('Puxada frontal aberta', 3, '12-15'), item('Desenvolvimento máquina', 3, '12-15'), item('Remada máquina articulada', 3, '12-15'), item('Rosca alternada', 2, '12-15'), item('Tríceps pulley (barra)', 2, '12-15')]),
      dia('Treino B — Inferiores', [item('Leg press 45°', 3, '12-15'), item('Cadeira extensora', 3, '12-15'), item('Cadeira flexora', 3, '12-15'), item('Cadeira abdutora', 3, '15'), item('Panturrilha sentado', 3, '15'), item('Prancha', 3, '30s', '30s')]),
    ] },
  };
  for (const [k, m] of Object.entries(modelos)) S.treinos.push({ id: 'mod-' + k, alunoId: null, ativo: false, obs: '', notas: '', ...JSON.parse(JSON.stringify(m)) });

  const alunos = [
    { nome: 'Ana Beatriz Souza', sexo: 'Feminino', nasc: '1996-04-12', altura: 165, objetivo: 'Hipertrofia', nivel: 'Intermediário', modalidade: 'Online', diasSemana: 4, ini: -74, modelo: 'abc', peso: 61, dPeso: 1.4, valor: 180, fator: 0.6, whatsapp: '92991110001' },
    { nome: 'Carlos Eduardo Lima', sexo: 'Masculino', nasc: '1988-09-30', altura: 178, objetivo: 'Emagrecimento', nivel: 'Iniciante', modalidade: 'Online', diasSemana: 3, ini: -60, modelo: 'full', peso: 98, dPeso: -5.2, valor: 150, fator: 0.9, parou: 11, restricoes: 'Dor lombar ocasional: evitar carga axial pesada', whatsapp: '92991110002' },
    { nome: 'Juliana Martins', sexo: 'Feminino', nasc: '1992-01-22', altura: 170, objetivo: 'Força', nivel: 'Avançado', modalidade: 'Híbrido', diasSemana: 4, ini: -38, modelo: 'abc', peso: 66, dPeso: 0.6, valor: 220, fator: 0.85, fim: 4, whatsapp: '92991110003' },
    { nome: 'Pedro Henrique Alves', sexo: 'Masculino', nasc: '2001-06-05', altura: 182, objetivo: 'Hipertrofia', nivel: 'Intermediário', modalidade: 'Online', diasSemana: 5, ini: -55, modelo: 'abc', peso: 74, dPeso: 2.1, valor: 180, fator: 1.1, whatsapp: '92991110004' },
    { nome: 'Mariana Costa', sexo: 'Feminino', nasc: '1985-11-17', altura: 160, objetivo: 'Saúde e qualidade de vida', nivel: 'Iniciante', modalidade: 'Online', diasSemana: 3, ini: -12, modelo: 'ini', peso: 72, dPeso: -0.8, valor: 150, fator: 0.45, restricoes: 'Condromalácia no joelho esquerdo: sem impacto', whatsapp: '92991110005' },
    { nome: 'Rafael Gomes', sexo: 'Masculino', nasc: '1990-03-03', altura: 175, objetivo: 'Condicionamento', nivel: 'Intermediário', modalidade: 'Presencial', diasSemana: 3, ini: -120, modelo: 'full', peso: 84, dPeso: -2, valor: 0, fator: 0.9, status: 'Pausado', parou: 40, whatsapp: '92991110006' },
  ];
  const BASE = { Peito: 24, Costas: 40, Ombros: 10, Bíceps: 12, Tríceps: 18, Quadríceps: 60, 'Posterior de coxa': 35, Glúteos: 50, Panturrilha: 40, Abdômen: 0, Cardio: 0, Mobilidade: 0, Lombar: 0, Antebraço: 10 };
  const ESPECIAL = { 'Leg press 45°': 140, 'Agachamento livre': 50, 'Remada curvada com barra': 40, 'Elevação pélvica (hip thrust)': 60, 'Agachamento goblet': 16, 'Afundo (passada)': 10, 'Supino reto com halteres': 16, 'Supino inclinado com halteres': 14, 'Desenvolvimento com halteres': 12, 'Elevação lateral': 7, 'Rosca martelo': 10, 'Rosca alternada': 8, 'Remada unilateral (serrote)': 18, 'Tríceps francês': 12 };
  const COMENT = ['Treino top hoje!', 'Senti um pouco o ombro direito no desenvolvimento.', 'Consegui subir a carga no leg 💪', 'Muito cansado hoje, dormi mal.', 'A cadeira extensora estava ocupada, fiz no smith.', 'Posso aumentar a carga do supino?', ''];
  const RESP = ['Boa! Na próxima tenta subir 2 kg mantendo a técnica.', 'Ótimo. Se o ombro incomodar de novo, reduz a amplitude e me avisa.', 'Excelente evolução! Continua assim.', 'Normal ter dias assim. Prioriza o sono essa semana.'];
  const PESOS = (d) => [5, 4, 4, 3, 5, 4, 3][d % 7];

  alunos.forEach((p, idx) => {
    const id = 'a' + (idx + 1), inicio = addDias(h, p.ini), status = p.status || 'Ativo';
    S.alunos.push({ id, nome: p.nome, sexo: p.sexo, nasc: p.nasc, altura: p.altura, objetivo: p.objetivo, nivel: p.nivel, modalidade: p.modalidade, diasSemana: p.diasSemana, inicio, status,
      plano: p.valor ? (p.modalidade === 'Online' ? 'Consultoria online mensal' : 'Consultoria ' + p.modalidade.toLowerCase()) : '', valor: p.valor, diaVenc: Number(inicio.slice(8)) > 28 ? 28 : Number(inicio.slice(8)),
      whatsapp: p.whatsapp, email: p.nome.split(' ')[0].toLowerCase() + '@exemplo.com', restricoes: p.restricoes || '', notas: idx === 1 ? 'Muito ansioso com a balança; reforçar medidas e fotos.' : '', criadoEm: inicio + 'T09:00:00' });
    const m = modelos[p.modelo], t = JSON.parse(JSON.stringify(m));
    Object.assign(t, { id: 't' + (idx + 1), alunoId: id, inicio, fim: p.fim != null ? addDias(h, p.fim) : addDias(inicio, 84), ativo: true, obs: idx === 0 ? 'Aquecer 5 min na esteira antes. Nas últimas séries, vá até perto da falha.' : '', notas: '' });
    t.dias.forEach((d) => { d.id = uid('d'); d.itens.forEach((it) => (it.id = uid('i'))); });
    S.treinos.push(t);

    // treinos registrados
    const diasTreino = { 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 4, 5] }[p.diasSemana];
    let k = 0;
    const fimReg = p.parou ? addDias(h, -p.parou) : addDias(h, -1);
    for (let d = inicio; d <= fimReg; d = addDias(d, 1)) {
      if (!diasTreino.includes(paraData(d).getDay()) || rnd() > 0.86) continue;
      const di = t.dias[k % t.dias.length]; k++;
      const sem = diasEntre(inicio, d) / 7, prog = 1 + 0.025 * sem;
      const itens = di.itens.map((it) => {
        const e = S.exercicios.find((x) => x.id === it.exId);
        const base = (ESPECIAL[e.nome] ?? BASE[e.grupo] ?? 10) * p.fator;
        const passo = /Halteres/.test(e.equipamento) ? 1 : 2.5;
        const n = parseInt(it.series, 10) || 3, [r0, r1] = (it.reps.match(/\d+/g) || ['10', '12']).map(Number);
        return { exId: it.exId, nome: e.nome, series: Array.from({ length: n }, (_, s) => {
          const c = base ? Math.round(base * prog * (s === n - 1 && n > 3 ? 0.9 : 1) / passo) * passo : '';
          return { carga: c === '' ? '' : String(c), reps: String(r1 ? Math.round(r0 + rnd() * (r1 - r0)) : r0), ok: rnd() > 0.04 };
        }) };
      });
      const recente = diasEntre(d, h) <= 2, temC = rnd() < 0.22, coment = temC ? COMENT[Math.floor(rnd() * COMENT.length)] : '';
      const hIni = 6 + Math.floor(rnd() * 13), dur = 45 + Math.floor(rnd() * 30);
      S.execucoes.push({ id: uid('e'), alunoId: id, treinoId: t.id, diaId: di.id, diaNome: di.nome, data: d, inicio: `${d}T${p2(hIni)}:10:00`, fim: `${d}T${p2(hIni + 1)}:${p2(dur - 45 + 10)}:00`, duracao: dur,
        esforco: 6 + Math.floor(rnd() * 4), comentario: coment, resposta: coment && !recente && rnd() < 0.8 ? RESP[Math.floor(rnd() * RESP.length)] : '', respondidoEm: coment && !recente ? addDias(d, 1) + 'T08:00:00' : null, visto: !recente, itens });
    }
    // check-ins semanais (online e híbrido) e avaliações
    const semanas = Math.floor(-p.ini / 7);
    if (p.modalidade !== 'Presencial') for (let w = 1; w <= semanas; w++) {
      const d = addDias(inicio, w * 7); if (p.parou && d > addDias(h, -p.parou)) break;
      if (idx === 0 && w === semanas) continue; // Ana ainda não mandou o desta semana
      const peso = Math.round((p.peso + p.dPeso * (w / semanas) + (rnd() - 0.5) * 0.6) * 10) / 10, recente = diasEntre(d, h) <= 2;
      S.checkins.push({ id: uid('c'), alunoId: id, data: d, em: d + 'T20:15:00', peso, sono: PESOS(w + idx), alimentacao: PESOS(w + idx + 2), energia: PESOS(w + idx + 1), estresse: 1 + Math.floor(rnd() * 3), agua: String(2 + Math.floor(rnd() * 3)),
        dor: idx === 1 && w === 3 ? 'Lombar travou um pouco depois do agachamento goblet' : '', comentario: w % 2 ? 'Semana boa, segui a dieta quase toda.' : 'Fim de semana saí da dieta, mas treinei tudo.',
        resposta: recente ? '' : 'Show! Vamos manter o foco. Qualquer coisa me chama.', respondidoEm: recente ? null : addDias(d, 1) + 'T09:00:00', visto: !recente });
    }
    const av = (d, frac) => ({ id: uid('av'), alunoId: id, data: d, peso: Math.round((p.peso + p.dPeso * frac) * 10) / 10, gordura: Math.round(((p.sexo === 'Feminino' ? 26 : 22) + (p.dPeso < 0 ? 4 : 0) - 2.2 * frac) * 10) / 10,
      medidas: { cintura: Math.round(((p.sexo === 'Feminino' ? 72 : 90) + (p.dPeso < 0 ? 12 : 0) - (p.dPeso < 0 ? 5 : 1.5) * frac) * 10) / 10, bracoD: Math.round(((p.sexo === 'Feminino' ? 28 : 35) + 1.2 * frac) * 10) / 10, coxaD: Math.round(((p.sexo === 'Feminino' ? 56 : 58) + 1.5 * frac) * 10) / 10, quadril: p.sexo === 'Feminino' ? 98 + frac : 100 - frac }, obs: '' });
    S.avaliacoes.push(av(inicio, 0));
    if (semanas >= 5) S.avaliacoes.push(av(addDias(inicio, 35), Math.min(1, 35 / -p.ini)));

    // mensalidades: meses anteriores pagos; o atual depende do aluno
    if (p.valor) for (let c = inicio.slice(0, 7); c <= h.slice(0, 7);) {
      const venc = c + '-' + p2(Math.min(28, Number(inicio.slice(8)))), atual = c === h.slice(0, 7);
      const pago = !atual ? true : venc <= h && idx !== 1 ? true : idx === 0;
      S.pagamentos.push({ id: 'pg-' + id + '-' + c, alunoId: id, comp: c, venc, valor: p.valor, pago, dataPag: pago ? (venc <= h ? venc : h) : null, forma: pago ? 'Pix' : '' });
      const [a, mm] = c.split('-').map(Number); const nx = new Date(a, mm, 1); c = `${nx.getFullYear()}-${p2(nx.getMonth() + 1)}`;
    }
  });
  // conversa de exemplo
  const msg = (alunoId, de, texto, dias, hora, lida = true) => S.mensagens.push({ id: uid('m'), alunoId, de, texto, em: new Date(paraData(addDias(h, dias)).getTime() + hora * 36e5).toISOString(), lida });
  msg('a1', 'prof', 'Oi, Ana! Subi a carga do supino para a próxima semana. Me conta como se sentir.', -3, 9);
  msg('a1', 'aluno', 'Fechado, prof! Senti bem hoje, consegui fazer todas as repetições.', -2, 19);
  msg('a1', 'aluno', 'Posso trocar o crossover pelo crucifixo? A academia está sem polia funcionando.', 0, 8, false);
  msg('a4', 'aluno', 'Prof, qual o melhor horário para tomar a creatina?', -1, 21, false);
  msg('a2', 'prof', 'Carlos, sumiu! Está tudo bem? Bora retomar essa semana.', -4, 10);
  msg('a5', 'prof', 'Bem-vinda, Mariana! Qualquer dúvida nos exercícios me chama por aqui.', -11, 10);
  msg('a5', 'aluno', 'Obrigada, prof! Vou começar amanhã.', -11, 12);
  return S;
}
