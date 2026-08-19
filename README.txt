┌─────────────────────────────────────────────────────────────┐
│                                                             │
│                              ✦				              │
│                                                             │
│                        O  R  I  O  N                        │
│                        F I N A N C E                        │
│                                                             │
│                       ╭────────────╮                        │
│                  ●────╯     ◉      ╰────✦                  │
│                       ╰────────────╯                        │
│                                                             │
│               CLAREZA PARA ENTENDER O DINHEIRO.             │
│                   ESTRUTURA PARA DECIDIR.	    		      │
│                                                             │
│                                                             │
│                    Produzido por João                       │
└─────────────────────────────────────────────────────────────┘

ORION FINANCE 2.0
Versão do aplicativo: 0.13.0
Estrutura do banco: 1.8.0


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SOBRE O ORION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Orion Finance é uma ferramenta pessoal de consciência financeira.

A proposta não é transformar o controle financeiro em uma planilha gigante.
O fluxo central é simples:

    REGISTRAR
        ↓
    VISUALIZAR
        ↓
    COMPREENDER
        ↓
    DECIDIR
        ↓
    EVOLUIR

Desktop e Mobile possuem interfaces próprias, mas utilizam o mesmo núcleo
financeiro e a mesma base central no Google Sheets.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
IDENTIDADE VISUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O ícone oficial do Orion está incluído em:

    assets/orion-icon-master.png

Versões utilizadas pelo aplicativo:

    assets/icon-512.png
    assets/icon-192.png
    assets/apple-touch-icon.png
    assets/favicon-32.png
    assets/orion-identidade-v0.11.png

A identidade visual atual combina:

    ◉ foco / consciência financeira
    ✦ estrela / direção e descoberta
    ◌ órbita / movimento, ciclo e leitura contínua
    ● origem / ponto de partida

O símbolo abandona gráficos financeiros literais. A leitura visual passa a
representar percepção, direção e evolução de forma mais abstrata e durável.
O conjunto também sugere discretamente um olhar: o Orion não apenas registra,
mas observa padrões para devolver clareza e capacidade de decisão.

Assinatura do projeto:

    Produzido por João




━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVENTOS — DECISÕES FUTURAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A v0.11.2 adiciona a primeira implementação da aba Eventos.

Princípio:

    SALDO NÃO É A MESMA COISA QUE DISPONIBILIDADE.

Eventos representam acontecimentos futuros que exigem preparação financeira.
A reserva é uma classificação interna e não altera artificialmente o saldo
bancário. O Orion passa a acompanhar custo estimado, valor reservado, restante,
percentual garantido e sugestão de ritmo de reserva.

O calendário externo continua responsável pela agenda. O Orion pode gerar um
arquivo .ics opcional, sem expor informações financeiras por padrão.

Novas tabelas sincronizadas:

    EVENTOS
    EVENTO_RESERVAS

A tabela TRANSACOES recebe o campo opcional evento_id para permitir vinculação
futura/gradual de gastos reais a um evento.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ESTRUTURA DO PROJETO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

orion-finance-2/
│
├── assets/
│   ├── orion-icon-master.png
│   ├── icon-512.png
│   ├── icon-192.png
│   ├── apple-touch-icon.png
│   └── favicon-32.png
│
├── core/
│   ├── config.js
│   ├── db.js
│   ├── finance.js
│   ├── dashboard-groups.js
│   ├── commitments.js
│   ├── sync.js
│   ├── orion.js
│   ├── recurring.js
│   ├── diagnostics.js
│   ├── goals.js
│   ├── investments.js
│   ├── game.js
│   ├── settings.js
│   ├── caju.js
│   └── theme.css
│
├── desktop/
│   ├── index.html
│   ├── desktop.css
│   ├── desktop.js
│   └── manifest.webmanifest
│
├── mobile/
│   ├── index.html
│   ├── mobile.css
│   ├── mobile.js
│   ├── manifest.webmanifest
│   └── service-worker.js
│
├── index.html
└── README.txt


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FUNCIONALIDADES ATUAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Contas e saldos
• Entradas e saídas
• Categorias e subcategorias
• Registro inteligente
• Sugestões baseadas no histórico
• Dívidas formais e informais
• Pagamentos vinculados às dívidas
• Transferências entre contas
• Reserva de emergência
• Investimentos e Radar
• Indicadores quantitativos
• Evolução Orion
• XP e níveis
• Conquistas
• Emblemas
• Medalhas evolutivas
• Tema Claro / Escuro / Automático
• Ocultar valores
• Sincronização manual
• Google Sheets como base central
• Exportação da planilha em Excel
• Reset completo dos dados
• PWA para iPhone
• Interface Desktop independente


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EVOLUÇÃO ORION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A gamificação recompensa comportamento real.

Exemplos:

    +10 XP     Movimentação registrada
    +30 XP     Pagamento de dívida
    +75 XP     25% da reserva
    +100 XP    50% da reserva
    +120 XP    Dívida quitada
    +250 XP    Reserva concluída

O nível representa experiência acumulada e não diminui.

Algumas conquistas:

    🏁 Primeiro Registro
    🧭 Mapa Ganho
    🗺 Cartógrafo
    🔥 Constância
    🧱 Fundação
    🛡 Meio Caminho
    🌕 Reserva Completa
    ✂ Menos Uma


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INVESTIMENTOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Investimentos funciona como uma trilha de evolução.

0% – 49% da reserva
    Foco na construção da reserva de emergência.

50% – 99%
    Familiarização com FIIs, ações, Radar e indicadores.

100%
    Módulo completo disponível.

Os indicadores são ferramentas quantitativas de apoio à análise.
Não constituem recomendação de investimento.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CAJU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

A Caju possui dois comportamentos distintos no Orion:

CAJU
    • uma única conta visível;
    • compra processada como Crédito;
    • reduz diretamente o saldo da própria Caju;
    • não gera fatura;
    • não interfere em outra conta;
    • R$ 400 são apresentados para confirmação no último dia útil do mês;
    • se não houver confirmação, após 5 dias o Orion volta a perguntar;
    • o lançamento nunca é criado silenciosamente.

Estruturas antigas como "Caju Saldo Livre" são desativadas automaticamente.
Transferências gerais do Orion continuam disponíveis quando necessárias.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REGISTRO INTELIGENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O Orion pode aprender combinações utilizadas anteriormente.

Exemplo:

    Saída
    R$ 82,00
    Mercado

Sugestão:

    Categoria: Alimentação
    Conta: Caju Alimentação
    Forma: Crédito

As sugestões nunca bloqueiam os campos.
O usuário continua podendo alterar qualquer opção antes de salvar.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONFIGURAÇÕES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Aparência
    • Automático
    • Claro
    • Escuro
    • Animações

API
    • Token Orion
    • conexão com a base central

Preferências
    • ocultar valores

Dados
    • sincronizar
    • exportar planilha (.xlsx)
    • Zerar Orion

Sobre
    • versão
    • estrutura


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
EXPORTAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Configurações
    ↓
Dados
    ↓
Exportar planilha (.xlsx)
    ↓
Confirmação
    ↓
Download

Não existe importação manual.

Desktop e Mobile utilizam a mesma base central, portanto a sincronização
é o mecanismo oficial de continuidade entre as plataformas.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ZERAR ORION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

O reset exige confirmação por popup:

    Cancelar
    Sim, apagar tudo

Ele remove:

    • contas
    • cartões
    • transações
    • dívidas
    • pagamentos
    • transferências
    • metas
    • reserva
    • Radar
    • XP
    • progresso

Ele preserva:

    • estrutura
    • instituições
    • categorias
    • subcategorias
    • frases
    • token/API
    • preferências


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BANCO E SINCRONIZAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Local:
    IndexedDB

Central:
    Google Sheets

API:
    Google Apps Script

Modo:
    local-first

Sincronização:
    manual e compartilhada entre Desktop e Mobile


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PWA / ÍCONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

No iPhone:

    Safari
        ↓
    Compartilhar
        ↓
    Adicionar à Tela de Início

O ícone oficial do Orion será utilizado pelo PWA.

Caso uma versão antiga do ícone permaneça em cache, remova o atalho
anterior da Tela de Início e adicione o Orion novamente.







━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREÇÃO v0.5.7 — RESET E NAVEGAÇÃO MOBILE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Corrigido erro interno do reset local que podia deixar o popup aberto.
• Reset usa timeout de rede e mostra o estado da operação dentro do popup.
• Ao concluir, o popup fecha e a interface é renderizada novamente.
• Em caso de falha, a mensagem aparece no próprio popup.
• Barra inferior Mobile redesenhada como dock flutuante inspirado no iOS.
• Dock acompanha tema Claro/Escuro com transparência, blur e contraste próprio.
• Nenhuma mudança no Apps Script ou no schema do banco.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREÇÃO v0.5.6 — RESET E CONTA CAJU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Depois de "Zerar Orion", a conta Caju não é mais recriada com saldo R$ 0,00.
• A conta Caju só é criada quando realmente necessária, por exemplo ao
  confirmar o crédito mensal de R$ 400.
• A sugestão mensal da Caju pode aparecer sem criar uma conta vazia.
• O Desktop passa a ter o mesmo "Zerar Orion" em Configurações > Dados.
• Desktop e Mobile usam o mesmo popup: Cancelar / Sim, apagar tudo.
• O reset continua apagando os dados locais e a planilha central,
  preservando a estrutura do aplicativo.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREÇÃO v0.5.5 — CONFIRMAÇÃO DO RESET
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• O botão "Zerar Orion" não exige mais digitar ZERAR.
• Agora abre um popup de confirmação.
• Opções: Cancelar ou "Sim, apagar tudo".
• O comportamento do reset permanece igual: apaga dados locais e da planilha,
  preservando estrutura, categorias, instituições, frases, token e preferências.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREÇÃO v0.5.4 — CAJU
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Caju passa a ter uma única conta visível.
• Estruturas antigas extras da própria Caju são desativadas.
• A confirmação dos R$ 400 aparece somente no último dia útil do mês.
• Se não for confirmada, o Orion volta a perguntar após 5 dias.
• A confirmação tardia registra o crédito com a data prevista do último dia útil.
• Dia útil local continua sendo calculado como segunda a sexta; feriados não
  são presumidos pelo aplicativo, por isso existe confirmação humana.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREÇÃO v0.5.3 — ZOOM NO IPHONE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Campos do PWA Mobile usam fonte mínima de 16px.
• Isso impede o zoom automático do iOS ao tocar no campo do token.
• Ao confirmar a chave, o foco do campo é removido antes do popup fechar.
• O PWA retorna à posição padrão da interface após a confirmação.
• Nenhuma alteração foi necessária no banco ou no Apps Script.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FUTURO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Algumas evoluções já previstas:

    ✦ Widget nativo para iOS
    ✦ Saúde financeira na Tela de Início
    ✦ XP e progresso no widget
    ✦ relatórios avançados
    ✦ novas conquistas e níveis
    ✦ análises financeiras mais profundas

O widget ficará para uma futura camada nativa do Orion.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

                          O R I O N

                Seu dinheiro deixa de desaparecer
                    quando começa a ter mapa.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CORREÇÃO v0.5.8 — SINCRONIZAÇÃO VISUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Sincronizar agora abre um popup de carregamento no Desktop e no Mobile.
• O fundo recebe desfoque, seguindo a linguagem visual das Configurações.
• Spinner e barra animada indicam que a sincronização está em andamento.
• O popup fecha automaticamente quando a sincronização termina.
• Nenhuma alteração no banco ou no Apps Script.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.6.0 — CONCILIAÇÃO REAL JULHO/AGOSTO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Registro automático por descrição removido. Conta, categoria e forma de pagamento são manuais.
• Mercado Pago passa a separar internamente saldo disponível e Reserva.
• Reserva não vira receita/despesa quando o dinheiro apenas muda de gaveta.
• Cofrinhos secundários podem existir sem poluir a lista de contas.
• Inter CDB Crédito é tratado como investimento-garantia, não como gasto.
• Compra do ingresso: R$ 504,33 em 2x sem juros (R$ 252,17 + R$ 252,16).
• Conta Caju visível representa apenas VA/Alimentação.
• Saldo Livre/Premiação Caju pode ser registrado no destino sem criar outra conta visível.
• Arquivo Apps Script v0.6.0 contém a função importarConciliacaoJulAgo2026().

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.6.2 — DASHBOARD POR INSTITUIÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Um único card por instituição no dashboard.
• Subcontas e reservas aparecem como linhas internas do banco.
• Instituições com saldo total R$ 0,00 ficam ocultas somente na tela principal.
• Contas zeradas continuam disponíveis em cadastro, movimentações e sincronização.
• Investimento-garantia do Inter aparece dentro do card Inter.
• Cartão de crédito aparece como compromisso, sem ser somado novamente ao patrimônio.
• Mercado Pago mostra a Reserva no próprio card e oculta cofrinhos zerados.
• Nenhuma alteração necessária no Apps Script v0.6.1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.6.3 — MOBILE + XP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Corrigida a renderização dos cards e movimentações no mobile.
• Dashboard por instituição ganhou fallback defensivo para nunca ficar em branco.
• Service Worker do mobile agora prioriza arquivos novos de interface e script.
• XP histórico passa a reconhecer 10 XP por movimentação conciliada.
• Eventos de registro não são somados em duplicidade.
• Medalhas agora usam símbolos visuais bronze/prata/ouro em vez de letras B/P/O.
• Apps Script permanece na v0.6.1.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.7.0 — ESTABILIDADE + DESPESAS RECORRENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Despesas recorrentes editáveis: mensal, quinzenal, semanal, anual e personalizado.
• Registrar uma recorrente abre o lançamento real pré-preenchido; o usuário ainda confirma tudo.
• Alterar valor previsto não reescreve o histórico.
• Recorrentes podem ser ocultadas sem exclusão.
• Diagnóstico Orion em Configurações > Dados.
• Dashboard mantém um único card por instituição e oculta instituições zeradas.
• XP histórico calculado por movimentações, evitando depender exclusivamente de EVENTOS_XP.
• Medalhas visuais revisadas.
• Banco local atualizado para IndexedDB v5.
• Estrutura central atualizada para 1.6.0 com DESPESAS_RECORRENTES.
• Apps Script necessário: v0.7.0. Execute atualizarEstruturaOrionV16() antes de reimplantar.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.8.0 — UX + ROBUSTEZ
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Barra inferior mobile redesenhada com ícones SVG consistentes.
• Sidebar desktop usa a mesma linguagem visual.
• Modal de sincronização agora é um modal central real em PWA e desktop.
• Safe areas e landscape revisados.
• Status da última sincronização e pendências locais visível no dashboard.
• Compromissos do mês: recorrentes + cartões comprometidos + dívidas previstas.
• Visibilidade por conta no dashboard:
  Automático / Sempre mostrar / Ocultar.
• Contas ocultas continuam disponíveis em movimentos e sincronização.
• Estados vazios, foco de teclado, contraste e feedback visual revisados.
• Medalhas redesenhadas em CSS, sem letras/emoji inconsistentes.
• Conteúdo desktop limitado para leitura confortável em monitores grandes.
• Preferência por reduced-motion respeitada.
• Apps Script v0.8.0 / estrutura 1.7.0.
• CONTAS ganha dashboard_visibilidade.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.8.1 — CORREÇÕES DE LAYOUT E MODAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Desktop: workspace reencaixado, gutters consistentes e content-grid responsivo.
• KPIs protegidos contra overflow.
• Painéis Contas / Últimas movimentações deixam de competir por largura.
• Mobile/Desktop: scroll da página bloqueado enquanto qualquer dialog estiver aberto.
• Ao fechar o dialog, a posição anterior da tela é restaurada.
• Overscroll/touch do fundo bloqueado em PWA/iPhone.
• Service Worker atualizado para cache v8-1.
• Apps Script permanece v0.8.0 / schema 1.7.0.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.8.2 — UX VISUAL / MOVIMENTAÇÕES / ASSINATURA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Toasts reforçados com fundo escuro e leitura garantida.
• Assinatura visual: “Produzido por João”.
• FAB mobile redesenhado com maior presença visual e rótulo “Lançar”.
• Recorrentes da aba Mov. migrados para acordeão recolhível.
• Cabeçalho de recorrentes mostra quantidade de despesas ativas.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.8.3 — REFINAMENTO VISUAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Reward/feedback compatível com tema claro e escuro.
• Formulários e dialogs recalibrados para contraste em ambos os temas.
• Botão “Lançar” mantido global e reforçado para alcance no mobile.
• Aba Mov. refinada visualmente sem alterar regras de lançamento.
• Recorrentes mantidas em acordeão com contador de ativas.
• Assinatura “Produzido por João” convertida em crédito discreto de rodapé.
• Navegação e cards receberam microajustes de contraste, profundidade e foco.
• Apps Script permanece v0.8.0 / schema 1.7.0.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.9.1 — HOME PREMIUM + SAÚDE FINANCEIRA + RADAR ORION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Tela inicial Mobile redesenhada com foco no visual aprovado na referência.
• Novo card de Saúde Financeira com leitura percentual do mês.
• Novo Radar Orion na home com destaque para concentração de gastos.
• Resumo principal reorganizado: saldo total, entradas, saídas e resultado.
• Dashboard Desktop recebeu o mesmo bloco de inteligência visual.
• Ajustes de ergonomia, hierarquia visual e consistência entre Mobile e Desktop.
• Nenhuma mudança estrutural no Apps Script foi necessária para esta versão.


HOTFIX v0.9.1
• Corrigida a identificação do schema: permanece 1.7.0.
• Backend alinhado novamente à estrutura atual da planilha.
• Nenhuma migração nova de estrutura é necessária além de atualizarEstruturaOrionV17().


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.9.5 — ESTABILIZAÇÃO MOBILE / CACHE ZERO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Mobile principal usa nomes físicos novos: mobile-v095.js e mobile-v095.css.
• Service Worker temporariamente aposentado para eliminar interferência de cache.
• Caches antigos do Orion são removidos no carregamento.
• Identidade visual foi incorporada ao próprio JS para evitar falha por módulo ausente.
• Indicador discreto v0.9.5 permite confirmar visualmente o build servido.
• Watchdog de inicialização exibe erro na própria interface se um módulo falhar.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.9.7 — EXTRATO POR INSTITUIÇÃO + XP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Cards das instituições agora são clicáveis.
• O clique abre um extrato filtrado apenas daquela instituição.
• O extrato mostra saldo atual, entradas, saídas e quantidade de registros.
• Clicar/tocar fora do card fecha a visão filtrada.
• ESC também fecha no desktop.
• Diagnóstico Orion passa a exibir XP calculado, XP das movimentações, XP extra e nível.
• O contador de EVENTOS_XP deixa de ser apresentado como se fosse XP total.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.9.9 — TEMAS VISUAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Aparência passa a tratar as quatro opções como temas visuais completos.
• Radar Visionário: azul profundo + dourado.
• Monograma Radar: azul elétrico + ciano.
• Visionário: índigo + violeta + ouro.
• Orbital: grafite + prata.
• Cada tema altera paleta, destaques, Saúde Financeira, Radar, símbolo e componentes internos.
• Claro / Escuro / Automático continuam definindo a luminosidade base do tema escolhido.
• Apps Script e schema permanecem inalterados.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.9.9 — SAÚDE COMPACTA + DÍVIDAS PREMIUM + EVOLUÇÃO TEMÁTICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Saúde Financeira mobile reduzida para leitura rápida na primeira dobra.
• Apenas a recomendação principal fica visível na home mobile.
• Aba Dívidas mobile redesenhada com resumo, progresso, vencimento e ação hierarquizados.
• Emblemas, nível, XP e detalhes da Evolução passam a acompanhar o Tema visual.
• Regras financeiras, XP e backend permanecem inalterados.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.10.0 — BASE DE SEGURANÇA + RENDIMENTOS + SOBRE ORION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Primeiro acesso a Investimentos pede apenas o salário bruto mensal.
• Meta inicial sugerida: 4 meses do salário bruto, com quantidade de meses personalizável.
• O usuário decide se deseja aplicar a sugestão à meta da reserva.
• A base pode ser revista em Configurações > Preferências > Base de segurança / salário.
• Investimentos permanece desfocado até concluir o onboarding inicial.
• Novo tipo visual de lançamento: Rendimento.
• Rendimento é salvo como entrada com forma de pagamento "rendimento_juros", sem alterar o schema.
• Compatível com rendimentos do Mercado Pago, Inter e futuras instituições.
• Tela Sobre redesenhada com identidade temática, arquitetura do Orion e assinatura "Produzido por João".
• Configurações endurecidas com normalização de tema, identidade, salário e meses para evitar estado local inválido.
• Apps Script e schema permanecem inalterados (1.7.0).


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.11.2 — EVENTOS + NOVA NAVEGAÇÃO + IDENTIDADE CONSOLIDADA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Principais mudanças:

• Nova aba Eventos: acontecimentos futuros com impacto financeiro.
• Reserva virtual por evento, sem alterar artificialmente o saldo bancário.
• Meta, margem opcional, valor reservado, restante e percentual garantido.
• Sugestão de ritmo de reserva por dia ou semana.
• Conclusão/cancelamento com liberação automática de sobra reservada.
• Exportação opcional .ics sem informações financeiras por padrão.
• Vínculo opcional de movimentações reais a Eventos.
• Novo indicador Dinheiro livre na Home.
• Navegação mobile com sete abas e Início exatamente no centro.
• Configurações promovidas a aba própria.
• Cabeçalho mobile identifica a aba ativa.
• Topo mobile mantém apenas sincronização, versão e plano Free/Premium/Pro.
• Saúde e Radar ganham detalhes clicáveis com blur.
• Evolução ampliada com novos emblemas e medalhas clicáveis.
• Méritos exibem progresso e data reconhecida quando disponível.
• Ajuste global de inputs para evitar zoom automático no iPhone.
• Scroll mobile recalibrado para terminar acima da navegação.
• Desktop atualizado com perfil local offline, estado Free e Eventos.
• Extrato filtrado desktop reforçado: X, clique externo e Esc.
• Identidade orbital aprovada aplicada aos assets internos.

Migração da base:

1. Use o Apps Script v0.11.1 seguro incluído no pacote (backend não mudou na v0.11.2).
2. Salve.
3. Execute atualizarEstruturaOrionV18() uma vez.
4. Reimplante o Aplicativo da Web em uma nova versão.
5. Publique os arquivos da v0.11.2 no GitHub Pages.
6. Abra o Orion e sincronize.

A migração adiciona EVENTOS, EVENTO_RESERVAS e a coluna opcional evento_id
em TRANSACOES, preservando as linhas existentes.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.11.1 — MIGRAÇÃO SEGURA E RECUPERAÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Backup completo automático antes da migração para 1.8.0.
• Migrações estruturais sem clear(): somente inserção de colunas.
• Verificação de IDs, quantidade de registros e somas críticas antes/depois.
• META só é atualizada após validação integral.
• Migração idempotente.
• Função de restauração de emergência com confirmação explícita.
• Importação histórica protegida por confirmação e backup.


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
v0.11.2 — HOTFIX DE ESTABILIDADE E PWA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Corrigido erro de sintaxe que interrompia a inicialização em Mobile e Desktop.
• Corrigida referência inexistente performSync no Desktop.
• Implementado renderBrandPicker para Configurações > Aparência.
• Inicialização endurecida para impedir que módulos secundários derrubem o app inteiro.
• Sidebar Desktop recalibrada, com contraste escuro e rolagem própria quando necessário.
• Responsividade e limites de viewport revisados.
• Final do scroll Mobile alinhado imediatamente acima da navegação fixa.
• Início permanece exatamente no centro dos sete itens da navegação Mobile.
• Inputs/selects/textareas Mobile permanecem com 16 px ou mais para evitar zoom automático do Safari/iPhone.
• Service Worker Mobile atualizado para o cache v11-2, sem limpeza destrutiva a cada inicialização.
• Ícones PWA refeitos em versão full-bleed e maskable para eliminar a borda branca externa.
• Backend seguro permanece v0.11.1 / schema 1.8.0. Não é necessário repetir a migração se ela já foi concluída.


v0.12.0 — PERFIL LOCAL + PREMIUM FUNCIONAL
• Perfil local offline clicável em Mobile e Desktop, sem autenticação.
• Premium clicável em chips/cards e ativável localmente para teste.
• Recursos Premium: comparativo de 30 dias, Radar avançado, cenários e relatório executivo.
• O Free mantém as funções essenciais. Backend/schema 1.8.0 inalterados.


v0.13.0 — EXPERIÊNCIA PWA HIGH-END
-----------------------------------
• Home reposiciona saldo, resultado e dinheiro livre como informação primária.
• Saúde e Radar compactos e clicáveis.
• Contas em linhas compactas e clicáveis, abrindo Perfil da Conta no Mobile e Desktop.
• Navegação PWA: Mov., Invest., Início central, Config. e Mais.
• Menu Mais reúne Dívidas, Eventos, Evolução, Premium e acesso às Contas.
• Botão flutuante reduzido para apenas +.
• Novo movimento compacto com Saída, Entrada, Transferência e Rendimento.
• Transferência usa o fluxo nativo entre contas e não conta como receita/despesa.
• Campo Finalidade ajuda a contextualizar movimentações e transferências.
• Categorias de entrada ampliadas e sincronizáveis sem migração de schema.
• Configurações compactadas para evitar scroll quando não necessário.
• Inputs permanecem com 16px ou mais para proteger contra zoom automático no iPhone.
• Backend permanece schema 1.8.0 / Apps Script seguro v0.11.1.
