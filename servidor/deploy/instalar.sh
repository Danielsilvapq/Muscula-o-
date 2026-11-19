#!/usr/bin/env bash
# Instala (ou atualiza) o Consultoria de musculação num servidor Ubuntu 22.04/24.04.
# Roda no servidor, como root:  bash /opt/consultoria/servidor/deploy/instalar.sh meu-dominio.com.br
# Pode rodar de novo quantas vezes quiser: os dados (servidor/dados/) nunca são apagados.
# Convive com outros sistemas no mesmo servidor (ex.: Beach Sports 092 e Connect Lava Jato): cada um tem sua porta,
# seu serviço e seu arquivo em /etc/caddy/sites/. Este script não mexe nos arquivos dos outros.
set -euo pipefail

DOMINIO="${1:?Informe o domínio. Ex.: bash instalar.sh app.minhaconsultoria.com.br}"
APP=/opt/consultoria
ENV_FILE=/etc/consultoria.env
SERVICO=consultoria
export DEBIAN_FRONTEND=noninteractive

# Servidores pequenos (1 GB): cria 1 GB de swap para o apt/Node não travarem (se ainda não houver)
if [ -z "$(swapon --show --noheadings)" ] && [ ! -f /swapfile ]; then
  echo "==> Criando swap"
  fallocate -l 1G /swapfile && chmod 600 /swapfile && mkswap /swapfile >/dev/null && swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> Pacotes do sistema"
apt-get update -qq
apt-get install -y -qq ca-certificates curl gnupg debian-keyring debian-archive-keyring apt-transport-https rsync openssl iproute2 >/dev/null

echo "==> Node.js"
if ! command -v node >/dev/null || ! node -e 'const [a,b]=process.versions.node.split(".").map(Number);process.exit(a>22||(a===22&&b>=13)?0:1)'; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash - >/dev/null
  apt-get install -y -qq nodejs >/dev/null
fi
node -v

echo "==> Caddy (HTTPS automático)"
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor --yes -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -qq
  apt-get install -y -qq caddy >/dev/null
fi

echo "==> Usuário e pastas"
id consultoria >/dev/null 2>&1 || useradd --system --home "$APP" --shell /usr/sbin/nologin consultoria
mkdir -p "$APP/servidor/dados/backups"
chown -R root:root "$APP"
chown -R consultoria:consultoria "$APP/servidor/dados"
chmod 750 "$APP/servidor/dados"

# Senha inicial do admin e porta: escolhidas só na primeira instalação e guardadas em $ENV_FILE
SENHA_NOVA=""
if [ ! -f "$ENV_FILE" ]; then
  SENHA_NOVA="$(openssl rand -base64 12 | tr -d '/+=' | cut -c1-12)"
  # portas reservadas: as que estão em uso agora e as que os outros sites do Caddy usam (mesmo que estejam parados)
  RESERVADAS="$( { ss -tln | awk '{print $4}' | grep -oE '[0-9]+$'; \
    grep -hoE 'reverse_proxy[[:space:]]+[^[:space:]]*:[0-9]+' /etc/caddy/sites/*.caddy /etc/caddy/Caddyfile 2>/dev/null | grep -oE '[0-9]+$'; } | sort -u)"
  PORTA=3300
  while echo "$RESERVADAS" | grep -qx "$PORTA"; do PORTA=$((PORTA + 1)); done
  printf 'ADMIN_SENHA_INICIAL=%s\nPORT=%s\n' "$SENHA_NOVA" "$PORTA" > "$ENV_FILE"
  chmod 600 "$ENV_FILE"
fi
PORTA="$(grep '^PORT=' "$ENV_FILE" | cut -d= -f2)"
echo "    porta interna: $PORTA"

echo "==> Serviço"
cat > /etc/systemd/system/$SERVICO.service <<EOF
[Unit]
Description=Consultoria de musculação
After=network.target

[Service]
User=consultoria
WorkingDirectory=$APP/servidor
Environment=HOST=127.0.0.1 TRUST_PROXY=1 TZ=America/Manaus RAIZ=$APP
EnvironmentFile=$ENV_FILE
ExecStart=/usr/bin/node --no-warnings server.js
Restart=always
RestartSec=3
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$APP/servidor/dados

[Install]
WantedBy=multi-user.target
EOF

# Cada sistema do servidor tem seu arquivo em /etc/caddy/sites/.
mkdir -p /etc/caddy/sites
# Guarda uma cópia do que existe para desfazer se algo der errado (os outros sites não podem cair)
BKP_CADDY="$(mktemp -d)"
cp -a /etc/caddy/Caddyfile "$BKP_CADDY/" 2>/dev/null || true
cp -a /etc/caddy/sites/consultoria.caddy "$BKP_CADDY/" 2>/dev/null || true
grep -qxF 'import /etc/caddy/sites/*.caddy' /etc/caddy/Caddyfile 2>/dev/null \
  || echo 'import /etc/caddy/sites/*.caddy' >> /etc/caddy/Caddyfile
cat > /etc/caddy/sites/consultoria.caddy <<EOF
$DOMINIO {
	encode gzip
	header Strict-Transport-Security "max-age=31536000"
	reverse_proxy 127.0.0.1:$PORTA
}
EOF
if ! caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile >/dev/null 2>&1; then
  echo "A configuração do Caddy ficou inválida. Desfazendo; os outros sites continuam como estavam."
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile 2>&1 | tail -5 || true
  [ -f "$BKP_CADDY/Caddyfile" ] && cp -a "$BKP_CADDY/Caddyfile" /etc/caddy/Caddyfile
  if [ -f "$BKP_CADDY/consultoria.caddy" ]; then cp -a "$BKP_CADDY/consultoria.caddy" /etc/caddy/sites/; else rm -f /etc/caddy/sites/consultoria.caddy; fi
  exit 1
fi

echo "==> Firewall"
if command -v netfilter-persistent >/dev/null; then
  # Oracle Cloud: a imagem vem com iptables bloqueando tudo menos o SSH; libera o site
  for porta in 80 443; do
    iptables -C INPUT -p tcp --dport "$porta" -j ACCEPT 2>/dev/null || iptables -I INPUT -p tcp --dport "$porta" -j ACCEPT
  done
  netfilter-persistent save >/dev/null
else
  apt-get install -y -qq ufw >/dev/null
  ufw allow OpenSSH >/dev/null
  ufw allow 80/tcp >/dev/null
  ufw allow 443/tcp >/dev/null
  ufw --force enable >/dev/null
fi

systemctl daemon-reload
systemctl enable $SERVICO >/dev/null 2>&1
systemctl restart $SERVICO
# reload (não restart): os outros sites não caem
systemctl reload caddy 2>/dev/null || systemctl restart caddy

sleep 2
if systemctl is-active --quiet $SERVICO; then
  echo
  echo "=================================================="
  echo " Pronto! Acesse: https://$DOMINIO"
  if [ -n "$SENHA_NOVA" ]; then
    echo " Usuário: professor"
    echo " Senha:   $SENHA_NOVA"
    echo " (anote e troque em \"Minha senha\" no primeiro acesso)"
  fi
  echo "=================================================="
  echo " Na primeira vez o cadeado (HTTPS) pode levar 1 minuto para ficar pronto."
else
  echo "O sistema não iniciou. Veja o erro com: journalctl -u $SERVICO -n 50"
  exit 1
fi
