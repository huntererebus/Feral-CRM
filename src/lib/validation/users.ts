import { z } from "zod";

export const inviteUserSchema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1).max(200),
    role: z.enum(["org_admin", "account_manager", "editor", "client"]),
    clientId: z.string().optional(), // required when role === "client"
  })
  .refine((data) => (data.role === "client" ? !!data.clientId : true), {
    message: "clientId is required when inviting a client-role user.",
    path: ["clientId"],
  });
