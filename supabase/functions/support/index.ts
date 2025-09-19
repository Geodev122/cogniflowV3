// supabase/functions/support/index.ts
// Deno Deploy / Edge Function
// Route prefix expected by the frontend: /api/support/* and /api/profiles

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.2";

// Helpers ---------------------------------------------------------------------
function json(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), {
    headers: { "content-type": "application/json; charset=utf-8" },
    ...init,
  });
}

function bad(msg = "Bad Request", status = 400) {
  return json({ error: msg }, { status });
}

function notFound(msg = "Not Found") {
  return json({ error: msg }, { status: 404 });
}

function methodNotAllowed() {
  return json({ error: "Method not allowed" }, { status: 405 });
}

function getPath(url: URL) {
  // Edge funcs run at /functions/v1/support; we’ll emulate /api/* under it.
  // e.g. /api/support/tickets => pathname ends with /support/api/support/tickets
  const parts = url.pathname.split("/support");
  return parts.length > 1 ? parts[1] : url.pathname; // everything after /support
}

function getAuthClient(req: Request) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: req.headers.get("Authorization")! } },
  });
}

// Routing ---------------------------------------------------------------------
serve(async (req) => {
  try {
    const url = new URL(req.url);
    const path = getPath(url); // e.g. "/api/support/tickets"
    const supabase = getAuthClient(req);

    // ---- PROFILES SEARCH -----------------------------------------------------
    if (path.startsWith("/api/profiles")) {
      if (req.method !== "GET") return methodNotAllowed();
      const q = url.searchParams.get("q")?.trim() ?? "";
      const role = url.searchParams.get("role")?.trim() ?? "";

      let query = supabase
        .from("profiles")
        .select("id, email, first_name, last_name, role")
        .limit(50);

      if (role) query = query.eq("role", role);
      if (q) {
        const like = `%${q}%`;
        query = query.or(
          `first_name.ilike.${like},last_name.ilike.${like},email.ilike.${like}`
        );
      }

      const { data, error } = await query;
      if (error) return bad(error.message, 400);
      return json(data ?? []);
    }

    // ---- SUPPORT CATEGORIES (static) ----------------------------------------
    if (path === "/api/support/categories") {
      if (req.method !== "GET") return methodNotAllowed();
      return json([
        { key: "billing", name: "Billing & Payments" },
        { key: "bug", name: "Bug Report" },
        { key: "feature", name: "Feature Request" },
        { key: "account", name: "Account & Access" },
        { key: "clinical-data", name: "Clinical Data" },
        { key: "other", name: "Other" },
      ]);
    }

    // ---- SUPPORT TAGS (optional table: support_tags) ------------------------
    if (path === "/api/support/tags") {
      if (req.method !== "GET") return methodNotAllowed();
      const { data, error } = await supabase
        .from("support_tags")
        .select("key,label")
        .order("label", { ascending: true });
      if (error) {
        // If you don’t have a table, return empty gracefully.
        return json([]);
      }
      return json(data ?? []);
    }

    // ---- SUPPORT TICKETS LIST (via view v_support_ticket_list) --------------
    if (path === "/api/support/tickets") {
      if (req.method === "GET") {
        const q = url.searchParams.get("q") ?? "";
        const status = url.searchParams.get("status") ?? "";
        const priority = url.searchParams.get("priority") ?? "";
        const category = url.searchParams.get("category") ?? "";
        const assignee = url.searchParams.get("assignee") ?? "";
        const requester = url.searchParams.get("requester") ?? "";

        let query = supabase
          .from("v_support_ticket_list")
          .select("*")
          .order("last_activity_at", { ascending: false })
          .limit(200);

        if (status) query = query.eq("status", status);
        if (priority) query = query.eq("priority", priority);
        if (category) query = query.eq("category_key", category);
        if (assignee) query = query.ilike("assignee_email", `%${assignee}%`);
        if (requester) query = query.ilike("requester_email", `%${requester}%`);
        if (q) {
          const like = `%${q}%`;
          query = query.or(
            [
              `subject.ilike.${like}`,
              `latest_message_preview.ilike.${like}`,
              `requester_email.ilike.${like}`,
              `assignee_email.ilike.${like}`,
              `ticket_number.ilike.${like}`,
            ].join(",")
          );
        }

        const { data, error } = await query;
        if (error) return bad(error.message, 400);
        return json(data ?? []);
      }

      if (req.method === "POST") {
        const body = await req.json();
        const {
          requester_id,
          subject,
          description,
          priority = "medium",
          category_key = "other",
          initial_message,
          tags = [],
        } = body || {};

        if (!requester_id || !subject || !description) {
          return bad("Missing required fields: requester_id, subject, description");
        }

        // Insert ticket
        const { data: t, error: tErr } = await supabase
          .from("support_tickets")
          .insert({
            requester_id,
            subject,
            priority,
            category_key,
            status: "open",
            last_activity_at: new Date().toISOString(),
            tags,
          })
          .select("*")
          .single();

        if (tErr) return bad(tErr.message, 400);

        // Optional first message
        if (initial_message) {
          await supabase.from("support_ticket_messages").insert({
            ticket_id: t.id,
            sender_id: requester_id,
            body: initial_message,
            is_internal: false,
          });
        }

        // Return ticket list item format by selecting from the view
        const { data: listItem } = await supabase
          .from("v_support_ticket_list")
          .select("*")
          .eq("id", t.id)
          .maybeSingle();

        return json(listItem ?? t, { status: 201 });
      }

      return methodNotAllowed();
    }

    // ---- SUPPORT TICKET DETAIL / PATCH --------------------------------------
    // /api/support/tickets/:id
    if (path.startsWith("/api/support/tickets/")) {
      const parts = path.split("/");
      const id = parts[parts.length - 1];
      if (!id || id === "tickets") return notFound();

      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("v_support_ticket_list")
          .select("*")
          .eq("id", id)
          .single();
        if (error) return notFound(error.message);
        return json(data);
      }

      if (req.method === "PATCH") {
        const patch = await req.json();
        const allowed = ["status", "priority", "subject", "assignee_id", "tags"] as const;
        const update: Record<string, unknown> = {};
        for (const key of allowed) {
          if (patch[key] !== undefined) update[key] = patch[key];
        }
        update["updated_at"] = new Date().toISOString();

        const { data, error } = await supabase
          .from("support_tickets")
          .update(update)
          .eq("id", id)
          .select("*")
          .single();

        if (error) return bad(error.message, 400);

        // Return updated list item
        const { data: listItem } = await supabase
          .from("v_support_ticket_list")
          .select("*")
          .eq("id", id)
          .maybeSingle();

        return json(listItem ?? data);
      }

      return methodNotAllowed();
    }

    // ---- SUPPORT TICKET MESSAGES --------------------------------------------
    // GET/POST /api/support/tickets/:id/messages
    if (path.match(/^\/api\/support\/tickets\/[^/]+\/messages$/)) {
      const ticketId = path.split("/")[4];
      if (req.method === "GET") {
        const { data, error } = await supabase
          .from("support_ticket_messages_expanded") // optional view, else use base table/select columns
          .select(
            "ticket_id,id as message_id,body,is_internal,attachments,created_at,sender_id,sender_email:sender(email),sender_name:sender(first_name,last_name)"
          )
          .eq("ticket_id", ticketId)
          .order("created_at", { ascending: true });
        if (error) return bad(error.message, 400);

        // If you don't have the expanded view, fetch from `support_ticket_messages`
        // and join sender separately (left as an exercise).
        const mapped =
          (data ?? []).map((r: any) => ({
            ticket_id: r.ticket_id,
            message_id: r.message_id,
            body: r.body,
            is_internal: r.is_internal,
            attachments: r.attachments ?? [],
            created_at: r.created_at,
            sender_id: r.sender_id,
            sender_email: r.sender?.email ?? null,
            sender_name:
              `${r.sender?.first_name ?? ""} ${r.sender?.last_name ?? ""}`.trim(),
          })) ?? [];

        return json(mapped);
      }

      if (req.method === "POST") {
        const { sender_id, body, is_internal = false, attachments = [] } =
          await req.json();

        if (!sender_id || !body) return bad("Missing sender_id or body");

        const { data, error } = await supabase
          .from("support_ticket_messages")
          .insert({
            ticket_id: ticketId,
            sender_id,
            body,
            is_internal,
            attachments,
          })
          .select("*")
          .single();

        if (error) return bad(error.message, 400);

        // Touch ticket last_activity_at
        await supabase
          .from("support_tickets")
          .update({ last_activity_at: new Date().toISOString() })
          .eq("id", ticketId);

        // Hydrate sender name/email for the response
        const { data: sender } = await supabase
          .from("profiles")
          .select("email,first_name,last_name")
          .eq("id", sender_id)
          .maybeSingle();

        return json({
          ticket_id: ticketId,
          message_id: data.id,
          body: data.body,
          is_internal: data.is_internal,
          attachments: data.attachments ?? [],
          created_at: data.created_at,
          sender_id: data.sender_id,
          sender_email: sender?.email ?? null,
          sender_name: `${sender?.first_name ?? ""} ${sender?.last_name ?? ""}`.trim(),
        });
      }

      return methodNotAllowed();
    }

    // Fallback: unknown path
    return notFound();
  } catch (e) {
    console.error("[support] unhandled error", e);
    return json({ error: "Server error" }, { status: 500 });
  }
});
