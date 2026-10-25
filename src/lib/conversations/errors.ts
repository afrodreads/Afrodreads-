// Erros de domínio. As rotas futuras traduzem `code` para o status HTTP; aqui
// não há nada de HTTP.

export class DomainError extends Error {
  constructor(
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Violação de unicidade no armazenamento (o adaptador do banco lança isto). */
export class UniqueConflictError extends Error {
  constructor() {
    super("Registro duplicado");
    this.name = "UniqueConflictError";
  }
}

export class InvalidPhoneError extends DomainError {
  constructor() {
    super("invalid_phone", "Telefone inválido.");
  }
}

export class UnitNotFoundError extends DomainError {
  constructor() {
    super("unit_not_found", "Unidade não encontrada ou inativa.");
  }
}

export class UnitRequiredError extends DomainError {
  constructor() {
    super("unit_required", "Há mais de uma unidade ativa: informe qual.");
  }
}

export class ConversationNotFoundError extends DomainError {
  constructor() {
    super("conversation_not_found", "Conversa não encontrada.");
  }
}

export class InvalidTransitionError extends DomainError {
  constructor(message: string) {
    super("invalid_transition", message);
  }
}

/** O modo da conversa mudou entre a leitura e a escrita (outra ação venceu). */
export class TransitionConflictError extends DomainError {
  constructor() {
    super("transition_conflict", "A conversa mudou de estado ao mesmo tempo. Tente de novo.");
  }
}

export class AiResponseBlockedError extends DomainError {
  constructor() {
    super("ai_blocked", "A IA não pode responder: a conversa não está em modo BOT.");
  }
}

export class InvalidInputError extends DomainError {
  constructor(message: string) {
    super("invalid_input", message);
  }
}

export class HandoffNotClaimableError extends DomainError {
  constructor() {
    super("handoff_not_claimable", "Não há encaminhamento em aberto para assumir nesta conversa.");
  }
}
