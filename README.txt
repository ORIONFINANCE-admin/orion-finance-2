ORION FINANCE v0.1.0 — NOVA EVOLUÇÃO — LOCAL ONLY

Esta versão corresponde à antiga evolução visual/funcional v0.5.0, reiniciada oficialmente como v0.1.0 para a nova fase do Orion.

BASE LIMPA
- Nenhum backup pessoal acompanha o pacote.
- Nenhuma conta financeira é criada automaticamente.
- Nenhuma movimentação, dívida, compromisso, meta, alocação ou snapshot é pré-cadastrado.
- O perfil pessoal local João H. permanece apenas como identidade interna do uso pessoal atual.

BANCO LOCAL ISOLADO
- Banco desta nova evolução: orion_finance_evolution_v01
- O banco antigo da v0.4.2 não é apagado.
- A nova v0.1.0 abre vazia para permitir um teste real de restauração.
- Para trazer seus dados, exporte o backup da v0.4.2 e importe-o manualmente na v0.1.0.

BACKUP / RESTAURAÇÃO
- A importação aceita o formato de backup anterior compatível.
- Antes de restaurar, o Orion gera uma cópia de segurança do estado local atual.
- A restauração não adiciona contas, dívidas ou compromissos que não existam no arquivo importado.

ARQUITETURA ATUAL
- Mobile/PWA
- Single profile / uso pessoal
- Local-only
- IndexedDB
- Sem Supabase, login ou backend nesta etapa.

NAVEGAÇÃO
Início | Mov. | + | Planejar | Contas
O + é uma ação global e não participa do swipe entre páginas.

IMPORTANTE
Esta versão foi preparada especificamente para validar a migração v0.4.2 -> nova v0.1.0 através de backup/restauração sem interferência dos dados que acompanhavam o pacote v0.5.0 anterior.
