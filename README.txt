ORION FINANCE — v0.2.0 — PREMIUM REBUILD

Reconstrução visual completa sobre a mesma base de dados local.

PONTOS CENTRAIS
- IndexedDB preservado: orion_finance_evolution_v01.
- Formato de backup atual preservado e importável.
- Nenhum seed financeiro foi adicionado.
- Navegação lateral por swipe continua removida.
- Início, Movimentações, Planejar e Contas foram reconstruídos visualmente com uma linguagem única.
- Gestão de contas existe somente na área Contas; Home é resumo e Configurações não duplica a função.
- Movimentações usam ícones contextuais por categoria/tipo.
- Planejar foi simplificado para estratégia, compromissos e dívidas.
- Conta Inter mantém saldo, garantia CDB e fatura separados.
- Perfil local e estrutura preparada para identidade futura permanecem.

ATUALIZAÇÃO
Se estiver substituindo uma versão anterior, preserve os dados do navegador/PWA e substitua os arquivos do projeto. O banco local usa o mesmo nome, então a atualização não deve zerar os dados. Ainda assim, faça um backup antes de publicar a atualização.

VALIDAÇÃO
A release foi preparada para preservar a semântica financeira e compatibilidade de backup. O teste final de PWA/Safari deve ser feito no iPhone após publicação, pois safe-area e comportamento de instalação pertencem ao runtime do iOS.
