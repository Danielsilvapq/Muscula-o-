// Gera um único arquivo HTML com a demonstração (estilo, código e ícone embutidos), para enviar ou
// publicar como página. Uso:  node ferramentas/gerar-demonstracao.js [arquivo-de-saida.html]
// Sem argumento, grava em demonstracao.html na raiz do repositório.
const fs = require('node:fs');
const path = require('node:path');
const raiz = path.join(__dirname, '..');
const ler = (f) => fs.readFileSync(path.join(raiz, f), 'utf8');
const saida = process.argv[2] || path.join(raiz, 'demonstracao.html');
const scripts = ['assets/exercicios.js', 'assets/app.js', 'assets/demo.js', 'assets/professor.js', 'assets/aluno.js'];
const icone = 'data:image/svg+xml;base64,' + Buffer.from(ler('assets/icone.svg')).toString('base64');
const html = `<title>Consultoria Fitness</title>
<meta name="description" content="Demonstração do sistema de consultoria de musculação: painel do professor e app do aluno.">
<link rel="icon" href="${icone}">
<meta name="theme-color" content="#D9480F">
<style>
${ler('assets/app.css')}
</style>
<div id="app"><p class="vazio">Carregando…</p></div>
<div id="modal" class="modal-bg" hidden onclick="if(event.target===this)fecharModal()"></div>
${scripts.map((f) => `<script>\n${ler(f).replace(/<\/script/gi, '<\\/script')}\n</script>`).join('\n')}
<script>iniciar();</script>
`;
fs.writeFileSync(saida, html);
console.log('Demonstração gerada:', saida, Math.round(html.length / 1024) + ' KB');
