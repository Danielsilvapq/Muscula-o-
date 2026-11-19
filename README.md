# Consultoria de musculação

Sistema para um professor acompanhar seus alunos (de preferência online): montar e enviar os treinos,
ver o que cada aluno fez, responder, acompanhar a evolução e controlar as mensalidades.

- **Demonstração:** abra `index.html` direto no navegador. Os dados são fictícios e ficam só no navegador.
  Dá para entrar como professor ou como um dos alunos (para ver o app no celular).
- **Online (uso real):** roda no servidor da Oracle, ao lado dos outros sistemas. Para publicar ou atualizar:
  aba **Actions → Publicar no servidor → Run workflow** (veja `Manuais/Publicar pelo GitHub.md`).
- **No computador:** `cd servidor && npm start` e abra http://localhost:3300 (usuário `professor`, senha `treino123`).

## O que o professor faz
- **Painel:** quem precisa de atenção (sem treinar há dias, sem treino montado, treino vencendo, check-in atrasado,
  mensalidade vencida), com botão para chamar no WhatsApp; e o que os alunos registraram (treinos, check-ins, fotos).
- **Alunos:** cadastro com objetivo, nível, modalidade (online, presencial ou híbrido), meta de treinos por semana,
  limitações e plano. Na página de cada aluno:
  - **Treinos:** monta as divisões (A, B, C…) com séries, repetições, carga, descanso, método e observação;
    começa em branco, de um modelo ou de uma cópia do treino atual. O treino ativo aparece na hora no app do aluno.
  - **Histórico:** cada treino feito, com as cargas de cada série, o esforço e o comentário do aluno. Dá para responder.
  - **Evolução:** gráfico da carga por exercício, peso corporal, avaliações físicas (peso, % de gordura, medidas)
    e fotos de antes e depois.
  - **Check-ins, mensagens, financeiro** e **acesso ao app** (cria usuário e senha e envia pelo WhatsApp).
- **Modelos de treino**, **biblioteca de exercícios** (86 já cadastrados; cada um pode ter o link do seu vídeo),
  **mensagens**, **financeiro** (mensalidades geradas sozinhas todo mês) e **configurações**.

## O que o aluno faz (no celular)
- Vê o treino do dia (o app sugere o próximo), marca cada série com carga e repetições (já vem preenchido com o
  que ele fez da última vez), usa o cronômetro de descanso e no fim dá uma nota de esforço e deixa um comentário.
- Acompanha a própria evolução, manda o check-in semanal (peso, sono, alimentação, energia, dores, fotos),
  conversa com o professor e vê as mensalidades e a chave Pix.
- Instala como aplicativo pelo navegador ("Adicionar à tela de início"), sem loja de aplicativos.

## Como está organizado
- `index.html` + `assets/` — as telas. `app.js` (dados, sincronização, gráficos), `professor.js`, `aluno.js`,
  `exercicios.js` (biblioteca inicial) e `demo.js` (dados fictícios da demonstração).
- `servidor/server.js` — servidor em Node.js (22.13+), sem dependências, com banco SQLite em `servidor/dados/`,
  login com senha criptografada, bloqueio após 5 tentativas erradas e backup diário. Cada aluno só recebe e só
  pode alterar o que é dele; as anotações particulares do professor nunca saem do servidor para o aluno.
- `servidor/deploy/instalar.sh` — instala/atualiza no Ubuntu (serviço `consultoria`, Caddy com HTTPS automático,
  porta própria; convive com os outros sistemas do mesmo servidor).
