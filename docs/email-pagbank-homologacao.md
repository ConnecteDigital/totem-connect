**Para:** pagbankparcerias@pagbank.com
**Cc:** gsantos46@pagbank.com, lpereira11@pagbank.com, asaboia@pagbank.com
**Assunto:** Re: Parcerias de Automação comercial – Connect Digital – app de autoatendimento (PlugPagServiceWrapper) pronto para homologação

*(Dica: responda direto na conversa que a Anna Flávia abriu em 09/09, assim o histórico fica junto.)*

---

Olá, pessoal, tudo bem?

Sou o Gabriel, da Connect Digital (CNPJ 55.161.845/0001-50, Jaguaquara/BA). Segue a atualização da nossa integração, depois de receberem o terminal de desenvolvimento.

**O que construímos**
Um totem de autoatendimento para lanchonetes. O cliente monta o pedido num tablet, e a cobrança é feita na maquininha, sem operador. Um app Android nosso roda na própria maquininha, usando o PlugPagServiceWrapper 1.35.0, e consulta o nosso servidor para abrir a cobrança automaticamente: crédito, débito ou Pix. Quando o pagamento é aprovado, o pedido avança no tablet e a senha sai numa impressora térmica do totem.

**O que já testamos (terminal Gertec GPOS780S, ambiente de teste)**
- Ativação do terminal e `doPayment` em crédito e débito: aprovados, sem nenhuma pergunta de comprovante na tela, e com o resultado devolvido ao totem em 1 a 2 segundos.
- Leitura recusada ou com erro: o app deixa o pedido na fila para nova tentativa.
- Cancelamento pelo cliente no totem: o app aborta a operação na maquininha com `abort()`.
- Pix: o QR code aparece na maquininha, mas nos testes que fizemos, dois apps de bancos diferentes responderam "não é possível pagar com este código".

**Nossas dúvidas**
1. **Homologação:** gostaríamos de iniciar a homologação do app. Pela documentação (Processo de integração), ela envolve a revisão de segurança (Baselines de Segurança Mobile) e a validação do consumo de dados pelos times de Integrações e de segurança. Podem nos confirmar o canal certo para enviar o app (pela documentação, a central de atendimento da SmartPOS no Pipefy) e o que precisam receber? Entendemos que seja o APK de release, um vídeo demonstrando o fluxo e a lista de endpoints que o app acessa. Qual é o prazo médio da revisão?
2. **Pix no terminal de teste:** é esperado que o QR code do Pix não seja pagável no ambiente de desenvolvimento? Existe um jeito de simular um Pix aprovado?
3. **Via do cliente (já resolvido, só queremos confirmar):** no início, o serviço perguntava na tela da maquininha se o cliente queria a via (imprimir, SMS ou nada), e isso segurava o resultado do pagamento. Como é um autoatendimento, o nosso app agora responde sozinho com `doPrintAction(5)` (não fazer nada). Em crédito e débito a pergunta não aparece mais e o resultado volta normalmente ao totem. A senha do pedido sai na impressora do totem. Essa abordagem é aceita por vocês? A via do cliente pela maquininha é obrigatória em algum caso? Hoje não emitimos documento fiscal pela maquininha.
4. **Tela do Pix:** a tela de pagamento do Pix (fundo branco, "escaneie o Pix ou aproxime com a carteira do Google") pode ser personalizada, ou existe alguma API de Pix para mostrarmos o QR no totem?
5. **Distribuição em produção:** como instalamos e atualizamos o nosso app nos terminais dos clientes? Precisa publicar na Loja de Aplicativos, passar por revenda, assinar o app de algum jeito especial?
6. **Terminais:** o terminal de desenvolvimento que recebemos é de empréstimo (comodato)? Como seria o modelo comercial para os terminais de produção que entregaremos aos estabelecimentos? Existe um código de ativação por terminal?
7. **Uso de dados:** vimos na documentação a estimativa de 10 KB por transação e o limite total de 30 MB por mês (15 MB do app de transações, 5 MB de consultas e 10 MB de apps gerenciais). O app só acessa o nosso servidor, em `https://totem-connect-puce.vercel.app/api/maquininha/` (rotas `pendentes`, `status` e `confirmar`), com HTTPS. O nosso app consulta o servidor por "espera longa": uma requisição pequena que o servidor segura por até 20 segundos e responde na hora se chegar um pedido. Isso dá cerca de 3 mil requisições por dia por terminal, cada uma com poucas centenas de bytes. Esse volume é aceitável? Os terminais ficarão em Wi-Fi nos estabelecimentos; o limite vale também nesse caso, ou só para dados móveis? Se for preciso reduzir mais, aceitamos qualquer orientação de vocês.

Podemos enviar o APK, logs e um vídeo do fluxo funcionando, se ajudar. Fico no aguardo e à disposição para uma chamada, se for mais fácil.

Obrigado!

Gabriel
Connect Digital
CNPJ 55.161.845/0001-50
