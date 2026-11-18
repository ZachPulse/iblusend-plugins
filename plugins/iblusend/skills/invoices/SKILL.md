---
name: invoices
description: "Read iBluSend invoices and what customers owe, and save an invoice draft after the person approves it. Only the person can send it, in the app; nothing is charged."
---

# Invoices

Use this to answer "who owes me money?" or to prepare an invoice. You cannot send an invoice,
give it a number, void it or take a payment, and you never see a pay link. The person opens the
draft and presses Send in the app.

## Access

- These tools work only when the person ticked Invoices on the Connect screen.
- Reading needs `invoices:read`. Saving a draft also needs `invoices:drafts:write`,
  which the person grants only by choosing Read and act.
- If a tool answers `insufficient_scope`, stop. Ask the person to reconnect and tick
  Invoices on the Connect screen, and to choose Read and act if they want drafts saved.
  Do not retry, do not look for another tool to get around it, and never ask for a key or
  password in chat.
- A connection made earlier keeps exactly what it granted. A new area needs a fresh connection.
- The connection covers one workspace. Leave `workspace_id` out.

## Tools

- `list_invoices` lists invoices with each customer's total, paid, balance, due date and
  status. `totals` matches the Invoices page cards: drafted, still due, overdue, received.
  Filter by `status`, `contact_id` or `search`.
- `get_invoice` reads one invoice: lines, notes, terms and what is left. A draft carries
  `send_check`, the things that would still stop the Send button.
- `create_invoice_draft` saves a new draft in US dollars, one payment due on `due_date`.
- `update_invoice_draft` changes a draft. Send only the fields to change; `items`
  replaces every line.

## Draft workflow

1. Resolve the customer with `list_contacts`. If two contacts could match, ask.
2. Write each line as a name, a quantity and a price in cents (`unit_cents`). Add
   `tax_rate` as a percent and `discount_cents` only if the person asked.
3. Show the customer, every line, the due date and the total the app will work out, and ask before
   saving. If the person says stop or changes the request, save nothing and show a new version.
4. Call `create_invoice_draft` or `update_invoice_draft` once.
5. Read `send_check`. If it lists something missing (a customer, a due date, a price), say so.
6. Give the person `app_url` (or `app_path` when `app_url` is empty) and say
   plainly: this is a draft, nothing was sent and no one was charged; they check it and press Send.

## Limits

- `created: false` means the same draft was saved minutes ago. Say so; do not make a copy.
- `invoice_not_draft` means it was already sent. It cannot change here.
- `invoice_read_only` means it has a split payment schedule; the person edits it in the app.
- `invoice_changed` means someone changed it in the app meanwhile. Read it again first.
- `invoice_owner_only` means this login is an agency's client: it can read invoices, not draft them.
- Amounts are in cents. Say them as dollars. Never say an invoice was sent, paid or charged.
