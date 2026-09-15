import { NextRequest } from "next/server";
import { requireSession } from "@/lib/session";
import { jsonOk, withRouteErrorHandling } from "@/lib/api-response";
import { getRequestIp } from "@/lib/audit";
import { createContactSchema, createContact, listContacts } from "@/lib/services/clients";

export const runtime = "nodejs";

type RouteParams = { params: { id: string } };

export const GET = withRouteErrorHandling(async (_request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const contacts = await listContacts(user, params.id);
  return jsonOk(contacts);
});

export const POST = withRouteErrorHandling(async (request: NextRequest, { params }: RouteParams) => {
  const { user } = await requireSession();
  const input = createContactSchema.parse(await request.json());
  const contact = await createContact(user, params.id, input, getRequestIp(request));
  return jsonOk(contact, { status: 201 });
});
