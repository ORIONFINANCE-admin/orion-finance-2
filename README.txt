ORION FINANCE 2.0 — PRIMEIRA VERSÃO FUNCIONAL

Estrutura:
- core/     núcleo compartilhado entre Mobile e Desktop
- mobile/   interface para iPhone / PWA
- desktop/  interface própria para PC

API:
A URL do Google Apps Script já está configurada.
O TOKEN NÃO está embutido no projeto.
Na primeira abertura de cada versão, o Orion pedirá o token.
Cole o mesmo token gerado pela função configurarOrion().

FUNCIONA NESTA VERSÃO:
- IndexedDB local
- uso offline após o primeiro carregamento
- sincronização manual
- aviso ao iniciar se a base online estiver mais recente
- cadastro de contas
- registro rápido de entradas e saídas
- categorias vindas do Google Sheets
- dashboard com saldo total, entradas, saídas e resultado
- cards das contas usando a cor da instituição
- frases contextuais de micro-recompensa
- interfaces Mobile e Desktop independentes
- PWA Mobile preparado para iPhone (safe-area, 100dvh e navegação inferior)

AINDA NÃO FOI LIBERADO NESTA VERSÃO:
- transferências entre contas
- cartões de crédito/faturas
- orçamento
- dívidas
- fechamento diário
Esses módulos já possuem base de dados e entrarão nas próximas versões sem refazer o núcleo.

IMPORTANTE:
O app deve ser servido por HTTPS (por exemplo, GitHub Pages) para o PWA funcionar corretamente no iPhone.
Não abra index.html diretamente por file://, pois módulos JavaScript e IndexedDB/PWA podem sofrer restrições.

ESTRUTURA DE PUBLICAÇÃO RECOMENDADA:
/
  core/
  mobile/
  desktop/

URLs resultantes:
.../mobile/
.../desktop/
