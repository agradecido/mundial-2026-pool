import { Resend } from "resend";

export const resend = new Resend(process.env.RESEND_API_KEY);

export const FROM_EMAIL = "Porra Mundial 2026 <noreply@porramundial.mdv.red>";
