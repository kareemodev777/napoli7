export type ContactFormState = {
  status: "idle" | "ok" | "error";
  error?: string;
  fieldErrors?: Partial<Record<"name" | "phone" | "email" | "message", string>>;
};

export const INITIAL_CONTACT_STATE: ContactFormState = { status: "idle" };
