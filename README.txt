ORION FINANCE v0.1 — RELEASE REVISADA
Camada mobile reconstruída e submetida a matriz de QA visual.

ORION FINANCE v0.1
==================

Reinício completo do Orion Finance.

Objetivo desta versão:
- começar do ponto financeiro atual, sem reaproveitar histórico antigo;
- interface minimalista high-end;
- local-first e offline;
- sincronização opcional com Google Sheets;
- contas, movimentações, perfis, cofrinhos/objetivos e aportes.

Navegação mobile:
MOV. | INÍCIO | PLANEJAR | MAIS

Arquitetura:
- mobile/ : PWA completo e responsivo
- desktop/ : redireciona para a mesma experiência responsiva
- assets/ : ícones locais
- backend/ : Apps Script opcional para Google Sheets

IMPORTANTE
---------
Esta v0.1 usa um banco IndexedDB novo chamado "orion_finance_v01".
Ela NÃO importa o histórico das versões 0.14.x.

O backend v0.1 também foi desenhado para uma base nova.
Leia backend/INSTALACAO.txt antes de configurar o Google Sheets.
