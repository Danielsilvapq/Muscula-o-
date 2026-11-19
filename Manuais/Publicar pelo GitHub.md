# Publicar a consultoria pelo GitHub (sem computador)

Funciona pelo navegador, até no celular. Usa o mesmo servidor da Oracle do Beach Sports e do lava jato
(`137.131.254.79`), mas com porta, serviço, banco de dados e endereço próprios: publicar a consultoria
**não tira os outros sistemas do ar**.

## Antes da primeira vez
Este repositório precisa ter o secret `ORACLE_SSH_KEY`, com a **mesma chave** usada no repositório do Beach Sports:
1. **Settings → Secrets and variables → Actions → New repository secret**.
2. Nome: `ORACLE_SSH_KEY`. Valor: o conteúdo inteiro do arquivo `.key` do servidor (com as linhas `-----BEGIN` e `-----END`).

Para usar outro servidor, crie a variável `SERVIDOR_IP` na aba **Variables** da mesma tela.

## Publicar ou atualizar
1. Aba **Actions** → à esquerda, **Publicar no servidor** → **Run workflow** → **Run workflow**.
   - Deixe o campo do domínio **vazio** para usar o endereço grátis **https://consultoria.137.131.254.79.sslip.io**.
   - Com domínio próprio (ex.: `app.minhaconsultoria.com.br`), crie antes, no painel do domínio, um registro **A** apontando para o IP do servidor e digite o domínio no campo.
2. Espere ficar verde (na primeira vez, de 3 a 5 minutos).
3. **Primeira vez:** abra a execução → passo **Instalar no servidor**. No final aparecem o endereço, o **usuário `professor`** e a **senha inicial**.
   Entre e troque a senha em **Configurações → Trocar minha senha**.

Atualizar é igual: rodar de novo. **Os dados do servidor não são apagados.**

## Backup
- O servidor faz uma cópia por dia e guarda 30 dias.
- Toda segunda-feira o GitHub busca essas cópias sozinho (workflow **Backup do servidor**).
  Para baixar: **Actions → Backup do servidor →** a execução mais recente **→ Artifacts → consultoria-backups**.
- O professor também pode baixar tudo em **Configurações → Baixar uma cópia de todos os dados**.

## Se der erro
- *"Falta cadastrar a chave"*: confira o nome `ORACLE_SSH_KEY` em **Settings → Secrets and variables → Actions**.
- *"Não consegui entrar no servidor com essa chave"*: a chave colada está incompleta ou o IP está errado.
- O endereço não abre logo depois de publicar: espere 1 minuto (o cadeado HTTPS é criado na primeira visita) e tente de novo.
