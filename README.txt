ORION FINANCE 2.0 — v0.14.1
=============================
Produzido por João

VERSÕES
-------
Frontend: 0.14.0
Apps Script: 0.14.0
Schema Google Sheets: 1.9.0
IndexedDB local: versão 7

DIREÇÃO DA v0.14.1
------------------
Menos dashboard, mais instrumento financeiro.

A experiência remove da navegação principal os conceitos de Premium, Radar e Evolução.
A Saúde Financeira permanece somente como um indicador discreto junto ao saldo.
Versão técnica fica em Configurações > Sobre.

PERFIS E ALOCAÇÕES
------------------
Perfil, conta e finalidade são conceitos diferentes:

Conta       = onde o dinheiro está fisicamente.
Perfil      = de quem é aquela parcela do patrimônio.
Finalidade  = para que o dinheiro foi separado.
Alocação    = vínculo entre perfil + conta física + finalidade.

Exemplo:
Mercado Pago físico: R$ 5.000
- João / Livre: R$ 1.000
- João / Reserva: R$ 3.500
- Maria Estela / Futuro: R$ 500

Não é necessário criar uma conta bancária para Maria Estela.
O Orion pode usar o mesmo Mercado Pago e separar internamente o patrimônio dela.

Aporte para perfil gerenciado:
+ > Aporte · perfil
Todos os campos são predefinidos e o usuário informa apenas o valor.
O aporte é uma realocação patrimonial e não uma receita/despesa bancária fictícia.

Novas tabelas:
PERFIS
ALOCACOES
MOVIMENTOS_ALOCACAO

As tabelas financeiras antigas não recebem colunas novas nesta migração.

MERCADO PAGO
------------
Estruturas históricas como Reserva e 15 anos Maria Estela permanecem na base para
preservar a matemática do histórico, mas deixam de ser tratadas como contas visuais
independentes no agrupamento da instituição. A experiência passa a privilegiar uma
única visão Mercado Pago + alocações/finalidades.

SINCRONIZAÇÃO
-------------
O Orion continua local-first.

Ao abrir:
1. IndexedDB local é carregado primeiro.
2. A interface fica disponível sem esperar a rede.
3. Se houver internet e token, a sincronização inicia automaticamente.
4. Sem internet, o estado muda para Offline e o app continua localmente.
5. Ao recuperar a conexão, uma nova tentativa automática é feita.

O comando manual de sincronização continua disponível.

OFFLINE / PWA
-------------
O Service Worker v14.0 faz precache explícito do shell completo do Mobile.
Navegação e recursos estáticos têm estratégias separadas.
Um arquivo JavaScript ausente nunca recebe index.html como fallback.
A instalação do Service Worker só conclui se os arquivos essenciais forem cacheados.

UX MOBILE
---------
Navegação principal:
Mov. | Invest. | Início | Planejar | Mais

Configurações ficam em Mais.
Perfis ficam no cabeçalho e em Mais.

Movimentações:
- cabeçalho e controles permanecem estáveis;
- somente o extrato rola.

Perfil da Conta:
- cabeçalho, saldo, resumo e filtro permanecem estáveis;
- somente a lista de movimentações rola.

LANÇAMENTOS
-----------
Valor usa máscara por centavos.
Ex.: 1234 -> 12,34.

Caju:
Selecionar Caju define Crédito automaticamente, mas sem cartao_id e sem fatura.
O valor reduz o saldo da própria conta Caju.

Transferência:
Continua sendo movimento entre contas, sem virar entrada + saída.

FRASES
------
O motor de mensagens foi alterado para:
- contexto do movimento;
- bloqueio de repetição recente;
- mensagens ocasionais em registros comuns;
- mensagens mais presentes em aportes, rendimentos, reserva e dívida;
- personalização eventual, sem repetir o nome em toda ação.

Google Sheets continua armazenando a tabela FRASES existente, mas a experiência
principal usa também um motor local original para evitar repetição mecânica.

INSTALAÇÃO DA v0.14.1
---------------------
LEIA backend/INSTALACAO_v0.14.1.txt antes de publicar o frontend.

Ordem recomendada:
1. Atualizar Apps Script.
2. Executar atualizarEstruturaOrionV19().
3. Confirmar o backup automático.
4. Reimplantar o Aplicativo da Web em NOVA VERSÃO.
5. Publicar os arquivos no GitHub Pages.
6. Abrir o PWA online uma vez para instalar o novo Service Worker.
7. Depois testar com Wi-Fi e dados móveis desligados.

NÃO execute novamente a importação histórica Jul/Ago 2026.
