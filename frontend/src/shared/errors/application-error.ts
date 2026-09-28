export type ApplicationErrorKind =
  | "validation"
  | "service-unavailable"
  | "timeout"
  | "unauthorized"
  | "not-found"
  | "unexpected";

const customerMessages: Record<ApplicationErrorKind, string> = {
  "not-found": "The requested resource could not be found.",
  "service-unavailable":
    "This service is temporarily unavailable. Please try again shortly.",
  timeout: "The request took too long. Please try again.",
  unauthorized: "Please sign in to continue.",
  unexpected: "Something went wrong. Please try again.",
  validation: "Please review the highlighted fields.",
};

export class ApplicationError extends Error {
  readonly customerMessage: string;
  readonly validationErrors?: Readonly<Record<string, string>>;

  constructor(
    readonly kind: ApplicationErrorKind,
    validationErrors?: Readonly<Record<string, string>>,
    customerMessage = customerMessages[kind],
  ) {
    super(customerMessages[kind]);
    this.name = "ApplicationError";
    this.customerMessage = customerMessage;
    this.message = customerMessage;
    this.validationErrors = validationErrors;
  }
}

export function createApplicationError(
  kind: ApplicationErrorKind,
  validationErrors?: Readonly<Record<string, string>>,
  customerMessage?: string,
): ApplicationError {
  return new ApplicationError(kind, validationErrors, customerMessage);
}
