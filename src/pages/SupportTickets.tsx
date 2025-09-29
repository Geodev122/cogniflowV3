import React, { useState } from 'react'
import { supabase, run } from '@/lib/supabase'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Mail } from 'lucide-react'

export default function SupportTickets() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault()
    setLoading(true)
    setStatus(null)
    try {
      // Defensive: try to write to contact_messages if it exists
      const payload: any = { name: name || null, email: email || null, message: message || null }
      try {
        const inserted = await run(supabase.from('contact_messages').insert(payload).select('*').single())
        if (inserted) {
          setStatus('Saved — thanks, we will follow up via email.')
        } else {
          setStatus('Submitted — but contact_messages table not available. Your message was not stored.')
        }
      } catch (err:any) {
        // Table might not exist or insert failed. Fall back to a fetch to an optional endpoint.
        console.warn('contact_messages insert failed, falling back', err)
        try {
          await fetch('/.netlify/functions/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
          setStatus('Sent via fallback endpoint — thanks!')
        } catch (err2:any) {
          console.error('fallback send failed', err2)
          setStatus('Could not submit message. Please email support@example.com')
        }
      }
      setName('')
      setEmail('')
      setMessage('')
    } finally { setLoading(false) }
  }

  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-10 rounded-lg bg-indigo-600 text-white grid place-items-center"><Mail className="w-5 h-5"/></div>
        <div>
          <h2 className="text-lg font-semibold">Contact & Support</h2>
          <p className="text-sm text-zinc-500">Submit a question or request and our team will follow up.</p>
        </div>
      </div>

      <Card>
        <CardContent>
          <form onSubmit={submit} className="space-y-3">
            <Input placeholder="Your full name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Textarea placeholder="How can we help?" value={message} onChange={(e) => setMessage(e.target.value)} rows={6} />

            <div className="flex items-center justify-end gap-2">
              <Button variant="outline" onClick={() => { setName(''); setEmail(''); setMessage('') }}>Clear</Button>
              <Button type="submit" disabled={loading || (!email && !message)}>{loading ? 'Sending…' : 'Send message'}</Button>
            </div>
          </form>

          {status && <div className="mt-3 text-sm text-zinc-700">{status}</div>}
        </CardContent>
      </Card>
    </div>
  )
}

const CATEGORY_META: Record<string, { icon: LucideIcon; label: string }> = {
  billing: { icon: DollarSign, label: "Billing & Payments" },
  bug: { icon: Bug, label: "Bug Report" },
  feature: { icon: Settings, label: "Feature Request" },
  account: { icon: User2, label: "Account & Access" },
  "clinical-data": { icon: AlertCircle, label: "Clinical Data" },
  other: { icon: Tag, label: "Other" },
};

function clsx(...c: (string | undefined | false)[]) {
  return c.filter(Boolean).join(" ");
}

function initials(name?: string) {
  if (!name) return "?";
  return name
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function StatusBadge({ status }: { status: TicketStatus }) {
  const map: Record<TicketStatus, string> = {
    open: "bg-emerald-100 text-emerald-700",
    pending: "bg-amber-100 text-amber-700",
    resolved: "bg-blue-100 text-blue-700",
    closed: "bg-zinc-200 text-zinc-700",
  };
  return <Badge className={clsx("rounded-full px-2.5 py-0.5 text-xs border-0", map[status])}>{status}</Badge>;
}

function PriorityBadge({ priority }: { priority: TicketPriority }) {
  const map: Record<TicketPriority, string> = {
    low: "bg-zinc-100 text-zinc-700",
    medium: "bg-sky-100 text-sky-700",
    high: "bg-orange-100 text-orange-700",
    urgent: "bg-rose-100 text-rose-700",
  };
  return <Badge className={clsx("rounded-full px-2.5 py-0.5 text-xs border-0", map[priority])}>{priority}</Badge>;
}

function CategoryChip({ category }: { category?: string | null }) {
  if (!category) return null;
  const meta = CATEGORY_META[category] ?? CATEGORY_META.other;
  const Icon = meta.icon;
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-700">
      <Icon className="h-3.5 w-3.5" /> {meta.label}
    </span>
  );
}

function AssigneePill({ name, email }: { name?: string | null; email?: string | null }) {
  const label = name || email || "Unassigned";
  return (
    <span className="inline-flex items-center gap-2 text-xs px-2 py-0.5 rounded-full bg-white border">
      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold">
        {initials(label)}
      </span>
      {label}
    </span>
  );
}

export default function SupportTickets() {
  const [tickets, setTickets] = useState<TicketListItem[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [priority, setPriority] = useState("");
  const [category, setCategory] = useState("");
  const [assignee, setAssignee] = useState("");

  const [categories, setCategories] = useState<SupportCategory[]>([]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [cats, list] = await Promise.all([
        api.listCategories().catch(() => [] as SupportCategory[]),
        api.listTickets({ q, status, priority, category, assignee }).catch(() => [] as TicketListItem[]),
      ]);
      setCategories(cats);
      setTickets(list);
      if (!activeId && list && list.length) setActiveId(list[0].id);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [q, status, priority, category, assignee, activeId]);

  useEffect(() => {
    load();
  }, [load]);

  const activeTicket = useMemo(() => tickets?.find((t) => t.id === activeId) || null, [tickets, activeId]);

  return (
    <div className="flex h-full w-full flex-col">
      <Header onRefresh={load} onNewTicketCreated={(t) => setTickets((prev) => (prev ? [t, ...prev] : [t]))} />

      <div className="px-4 pb-4">
        <FiltersBar
          q={q}
          onQ={setQ}
          status={status}
          onStatus={setStatus}
          priority={priority}
          onPriority={setPriority}
          category={category}
          onCategory={setCategory}
          assignee={assignee}
          onAssignee={setAssignee}
          categories={categories}
        />
      </div>

      <div className="grid grid-cols-12 gap-4 px-4 pb-4 h-[calc(100dvh-180px)]">
        <div className="col-span-12 lg:col-span-5 flex flex-col rounded-2xl border bg-white">
          <div className="flex items-center justify-between p-3 border-b">
            <div className="flex items-center gap-2 text-sm text-zinc-600">
              <TicketIcon className="h-4 w-4" /> Tickets
            </div>
            <div className="text-xs text-zinc-500">{tickets?.length ?? 0} results</div>
          </div>

          <ScrollArea className="flex-1">
            {loading && <ListSkeleton />}
            {!loading && error && <EmptyState icon={AlertCircle} title="Couldn’t load" subtitle={error} />}
            {!loading && !error && tickets && tickets.length === 0 && (
              <EmptyState icon={Search} title="No tickets" subtitle="Try adjusting your filters or search." />
            )}
            <div className="divide-y">
              {tickets?.map((t) => (
                <TicketRow
                  key={t.id}
                  t={t}
                  active={activeId === t.id}
                  onClick={() => {
                    setActiveId(t.id);
                    setSheetOpen(true);
                  }}
                />
              ))}
            </div>
          </ScrollArea>
        </div>

        <div className="hidden lg:flex col-span-7 rounded-2xl border overflow-hidden">
          {activeTicket ? (
            <TicketDetail key={activeTicket.id} ticket={activeTicket} onTicketChange={(nt) => mutateTicketInList(setTickets, nt)} />
          ) : (
            <div className="m-auto p-10 text-center text-zinc-500">
              <MessageCircle className="h-6 w-6 mx-auto mb-3" />
              Select a ticket to view details
            </div>
          )}
        </div>

        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="right" className="w-full sm:max-w-2xl p-0">
            <SheetHeader className="px-4 py-3 border-b">
              <SheetTitle>Ticket</SheetTitle>
            </SheetHeader>
            {activeTicket && (
              <TicketDetail key={activeTicket.id + "-m"} ticket={activeTicket} onTicketChange={(nt) => mutateTicketInList(setTickets, nt)} />
            )}
          </SheetContent>
        </Sheet>
      </div>
    </div>
  );
}

function Header({ onRefresh, onNewTicketCreated }: { onRefresh: () => void; onNewTicketCreated: (t: TicketListItem) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 p-4">
      <div className="flex items-center gap-3">
        <div className="h-9 w-9 rounded-2xl bg-zinc-900 text-white grid place-items-center">
          <TicketIcon className="h-4 w-4" />
        </div>
        <div>
          <div className="text-xl font-semibold">Support</div>
          <div className="text-sm text-zinc-500">Tickets, messages, and SLAs</div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" onClick={onRefresh} className="gap-2">
          <Loader2 className="h-4 w-4" /> Refresh
        </Button>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" /> New Ticket
            </Button>
          </DialogTrigger>
          <NewTicketDialog onCreated={(t) => { onNewTicketCreated(t); setOpen(false); }} />
        </Dialog>
      </div>
    </div>
  );
}

function NewTicketDialog({ onCreated }: { onCreated: (t: TicketListItem) => void }) {
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<TicketPriority>("medium");
  const [category, setCategory] = useState<string>("other");

  const [requesterQ, setRequesterQ] = useState("");
  const [requester, setRequester] = useState<ProfileLite | null>(null);
  const [results, setResults] = useState<ProfileLite[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let ignore = false;
    (async () => {
      setLoading(true);
      try {
        const r = await api.listProfiles(requesterQ);
        if (!ignore) setResults(r);
      } catch (err) {
        // log and ignore search errors
        console.error("listProfiles", err);
      } finally {
        setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [requesterQ]);

  const canCreate = Boolean(requester && subject.trim().length > 2 && description.trim().length > 4);

  const create = async () => {
    if (!requester) return;
    const t = await api.createTicket({ requester_id: requester.id, subject, description, priority, category_key: category });
    onCreated(t);
  };

  return (
    <DialogContent className="sm:max-w-2xl">
      <DialogHeader>
        <DialogTitle>Create support ticket</DialogTitle>
      </DialogHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
        <div className="sm:col-span-2">
          <Label>Requester</Label>
          <div className="mt-2 flex items-center gap-2">
            <Input placeholder="Search by name or email" value={requesterQ} onChange={(e) => setRequesterQ(e.target.value)} />
            {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          </div>
          <div className="mt-2 max-h-40 overflow-auto rounded border">
            {results.map((p) => (
              <button key={p.id} onClick={() => setRequester(p)} className={clsx("w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 flex items-center gap-2", requester?.id === p.id && "bg-zinc-100")}>
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold">{initials(`${p.first_name ?? ""} ${p.last_name ?? ""}`)}</span>
                <span>{p.first_name} {p.last_name} <span className="text-zinc-500">• {p.email}</span></span>
              </button>
            ))}
          </div>
          {requester && (
            <div className="mt-2 text-xs text-zinc-600">Selected: {requester.first_name} {requester.last_name} ({requester.email})</div>
          )}
        </div>
        <div className="sm:col-span-2">
          <Label>Subject</Label>
          <Input className="mt-2" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short summary" />
        </div>
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea className="mt-2 min-h-[140px]" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the problem or request..." />
        </div>
        <div>
          <Label>Priority</Label>
          <Select value={priority} onValueChange={(v: TicketPriority) => setPriority(v)}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="billing">Billing</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="account">Account</SelectItem>
              <SelectItem value="clinical-data">Clinical Data</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline">Cancel</Button>
        <Button disabled={!canCreate} onClick={create} className="gap-2"><Plus className="h-4 w-4" /> Create</Button>
      </DialogFooter>
    </DialogContent>
  );
}

function FiltersBar({ q, onQ, status, onStatus, priority, onPriority, category, onCategory, assignee, onAssignee, categories }:{
  q: string; onQ: (v:string)=>void;
  status: string; onStatus: (v:string)=>void;
  priority: string; onPriority: (v:string)=>void;
  category: string; onCategory: (v:string)=>void;
  assignee: string; onAssignee: (v:string)=>void;
  categories: SupportCategory[];
}){
  return (
    <Card className="rounded-2xl">
      <CardContent className="p-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          <div className="sm:col-span-4 flex items-center gap-2">
            <div className="relative w-full">
              <Search className="h-4 w-4 absolute left-2 top-2.5 text-zinc-400" />
              <Input value={q} onChange={(e)=>onQ(e.target.value)} placeholder="Search subject, message, requester..." className="pl-8" />
            </div>
          </div>
          <div className="sm:col-span-2">
            <Select value={status} onValueChange={onStatus}>
              <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Select value={priority} onValueChange={onPriority}>
              <SelectTrigger><SelectValue placeholder="Priority" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All priorities</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Select value={category} onValueChange={onCategory}>
              <SelectTrigger><SelectValue placeholder="Category" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="">All categories</SelectItem>
                {categories.map(c=> <SelectItem key={c.key} value={c.key}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Input value={assignee} onChange={(e)=>onAssignee(e.target.value)} placeholder="Assignee email" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TicketRow({ t, active, onClick }: { t: TicketListItem; active?: boolean; onClick: ()=>void }){
  const rel = formatDistanceToNow(new Date(t.last_activity_at), { addSuffix: true });
  return (
    <button onClick={onClick} className={clsx("w-full text-left p-3 hover:bg-zinc-50 flex gap-3", active && "bg-zinc-50")}>
      <div className="mt-0.5">
        <StatusBadge status={t.status} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium truncate">{t.subject}</span>
          <PriorityBadge priority={t.priority} />
          <CategoryChip category={t.category_key ?? undefined} />
        </div>
        <div className="mt-1 text-xs text-zinc-600 line-clamp-1">{t.latest_message_preview ?? ""}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-zinc-500">
          <Hash className="h-3.5 w-3.5" />{t.ticket_number}
          <span>•</span>
          <Mail className="h-3.5 w-3.5" /> {t.requester_email}
          <span>•</span>
          <Users className="h-3.5 w-3.5" /> <AssigneePill name={t.assignee_name} email={t.assignee_email ?? undefined} />
        </div>
      </div>
      <div className="text-xs text-zinc-500 whitespace-nowrap flex items-center gap-1">
        <Clock className="h-3.5 w-3.5" /> {rel}
      </div>
    </button>
  );
}

function TicketDetail({ ticket, onTicketChange }: { ticket: TicketListItem; onTicketChange: (t: TicketListItem)=>void }){
  const [messages, setMessages] = useState<TicketMessage[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [internal, setInternal] = useState(false);
  const [posting, setPosting] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async ()=>{
    setLoading(true);
    try{ setMessages(await api.getMessages(ticket.id)); }catch(err){ console.error('getMessages', err); setMessages([]);} finally{ setLoading(false); }
  },[ticket.id]);

  useEffect(()=>{ load(); },[load]);

  useEffect(()=>{
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  },[messages]);

  const doPost = async () => {
    if (!body.trim()) return;
    setPosting(true);
    try{
      // try to get a sender id from a global (fallback) or ticket fields
      const global = (window as unknown as { currentProfileId?: string }).currentProfileId;
      const sender_id = global ?? ticket.assignee_id ?? ticket.requester_id;
      const msg = await api.postMessage(ticket.id, { sender_id, body, is_internal: internal });
      setMessages((prev)=> prev ? [...prev, msg] : [msg]);
      setBody("");
    } catch (err) {
      console.error('postMessage', err);
    } finally{ setPosting(false); }
  };

  const changeStatus = async (next: TicketStatus) => {
    const nt = await api.patchTicket(ticket.id, { status: next });
    onTicketChange(nt);
  };
  const changePriority = async (next: TicketPriority) => {
    const nt = await api.patchTicket(ticket.id, { priority: next });
    onTicketChange(nt);
  };

  return (
    <div className="flex flex-col w-full">
      <div className="p-4 border-b flex items-center justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Hash className="h-3.5 w-3.5" /> {ticket.ticket_number}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-lg font-semibold truncate">{ticket.subject}</div>
            <PriorityBadge priority={ticket.priority} />
            <CategoryChip category={ticket.category_key ?? undefined} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2"><StatusBadge status={ticket.status}/> <ChevronDown className="h-4 w-4"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["open","pending","resolved","closed"] as TicketStatus[]).map(s=> (
                <DropdownMenuItem key={s} onClick={()=>changeStatus(s)} className="gap-2">
                  <StatusBadge status={s}/> {s}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2"><Filter className="h-4 w-4"/> {ticket.priority} <ChevronDown className="h-4 w-4"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["low","medium","high","urgent"] as TicketPriority[]).map(p=> (
                <DropdownMenuItem key={p} onClick={()=>changePriority(p)} className="gap-2">
                  <PriorityBadge priority={p}/> {p}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <AssigneeMenu ticket={ticket} onChanged={onTicketChange} />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon"><MoreHorizontal className="h-4 w-4"/></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={()=>window.print()} className="gap-2"><PrinterIcon/> Print</DropdownMenuItem>
              <DropdownMenuSeparator/>
              <DropdownMenuItem onClick={()=>changeStatus("resolved")} className="gap-2"><Check className="h-4 w-4"/> Mark as Resolved</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-0 flex-1 min-h-0">
        <div className="col-span-12 xl:col-span-8 flex flex-col">
          <ScrollArea className="flex-1" ref={scrollRef as unknown as React.RefObject<HTMLDivElement>}>
            {loading && <ThreadSkeleton/>}
            {!loading && messages && (
              <div className="p-4 space-y-3">
                {messages.map(m => <MessageBubble key={m.message_id} m={m} requesterId={ticket.requester_id} />)}
              </div>
            )}
          </ScrollArea>

          <div className="border-t p-3 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label className="text-zinc-600 text-sm">Add a message</Label>
              <div className="flex items-center gap-2 text-xs">
                <label className="inline-flex items-center gap-2 select-none">
                  <input type="checkbox" className="accent-zinc-900" checked={internal} onChange={(e)=>setInternal(e.target.checked)} />
                  Internal note
                </label>
              </div>
            </div>
            <Textarea value={body} onChange={(e)=>setBody(e.target.value)} placeholder={internal ? "Write an internal note (requester won’t see this)" : "Write a reply to the requester"} />
            <div className="flex items-center justify-end gap-2">
              <Button variant="outline">Attach</Button>
              <Button onClick={doPost} disabled={!body.trim() || posting} className="gap-2">{posting && <Loader2 className="h-4 w-4 animate-spin"/>} Send</Button>
            </div>
          </div>
        </div>

        <div className="hidden xl:block col-span-4 border-l">
          <Sidebar ticket={ticket} />
        </div>
      </div>
    </div>
  );
}

function Sidebar({ ticket }: { ticket: TicketListItem }){
  const created = format(new Date(ticket.created_at), "PPp");
  const updated = format(new Date(ticket.updated_at), "PPp");
  return (
    <div className="p-4 space-y-4">
      <div>
        <div className="text-xs uppercase text-zinc-500">Requester</div>
        <div className="mt-1 flex items-center gap-2">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold">{initials(ticket.requester_name)}</span>
          <div>
            <div className="text-sm font-medium">{ticket.requester_name}</div>
            <div className="text-xs text-zinc-600">{ticket.requester_email}</div>
          </div>
        </div>
      </div>
      <Separator/>
      <div className="grid grid-cols-2 gap-3 text-sm">
        <Info label="Status" value={<StatusBadge status={ticket.status}/>} />
        <Info label="Priority" value={<PriorityBadge priority={ticket.priority}/>} />
        <Info label="Category" value={<CategoryChip category={ticket.category_key ?? undefined} />} />
        <Info label="Ticket #" value={<span className="font-mono text-xs">{ticket.ticket_number}</span>} />
        <Info label="Created" value={created} />
        <Info label="Updated" value={updated} />
      </div>
      <Separator/>
      <div className="text-xs text-zinc-500">Add watchers, tags, or link to related resources here (extend as needed).</div>
    </div>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }){
  return (
    <div>
      <div className="text-xs uppercase text-zinc-500">{label}</div>
      <div className="mt-1">{value}</div>
    </div>
  );
}

function AssigneeMenu({ ticket, onChanged }: { ticket: TicketListItem; onChanged: (t: TicketListItem)=>void }){
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [list, setList] = useState<ProfileLite[]>([]);

  useEffect(()=>{
    if (!open) return;
    let ignore = false;
    (async()=>{
      try{ const r = await api.listProfiles(q, "therapist"); if(!ignore) setList(r);}catch(err){ console.error('listProfiles', err);} 
    })();
    return ()=>{ ignore = true; };
  },[open, q]);

  const assign = async (id: string|null) => {
    const nt = await api.patchTicket(ticket.id, { assignee_id: id });
    onChanged(nt);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2"><Users className="h-4 w-4"/>{ticket.assignee_name || "Assign"} <ChevronDown className="h-4 w-4"/></Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-0">
        <div className="p-2">
          <Input placeholder="Search" value={q} onChange={(e)=>setQ(e.target.value)} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={()=>assign(null)}>Unassigned</DropdownMenuItem>
        <DropdownMenuSeparator />
        <div className="max-h-64 overflow-auto">
          {list.map(p=> (
            <DropdownMenuItem key={p.id} className="gap-2" onClick={()=>assign(p.id)}>
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold">{initials(`${p.first_name ?? ""} ${p.last_name ?? ""}`)}</span>
              {p.first_name} {p.last_name} <span className="text-zinc-500">• {p.email}</span>
            </DropdownMenuItem>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function MessageBubble({ m, requesterId }: { m: TicketMessage; requesterId: string }){
  const mine = m.sender_id !== requesterId; // treat non-requester as team
  return (
    <div className={clsx("flex gap-2", mine ? "justify-end" : "justify-start")}>
      {!mine && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-200 text-[10px] font-semibold mt-0.5">{initials(m.sender_name)}</span>
      )}
      <div className={clsx("max-w-[80%] rounded-2xl px-3 py-2 text-sm", m.is_internal ? "bg-amber-50 border border-amber-200" : mine ? "bg-zinc-900 text-white" : "bg-zinc-100")}>
        {m.is_internal && (
          <div className="text-amber-700 text-[11px] mb-1 font-medium inline-flex items-center gap-1"><AlertCircle className="h-3 w-3"/> Internal note</div>
        )}
        <div className="whitespace-pre-wrap leading-relaxed">{m.body}</div>
        <div className="mt-1 text-[11px] opacity-70">{format(new Date(m.created_at), "PPp")} • {m.sender_name}</div>
      </div>
      {mine && (
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-white text-[10px] font-semibold mt-0.5">{initials(m.sender_name)}</span>
      )}
    </div>
  );
}

function mutateTicketInList(setter: React.Dispatch<React.SetStateAction<TicketListItem[] | null>>, updated: TicketListItem){
  setter((prev)=> prev ? prev.map(t=> t.id === updated.id ? updated : t) : [updated]);
}

function ListSkeleton(){
  return (
    <div className="p-3 space-y-3">
      {Array.from({length:6}).map((_,i)=> (
        <div key={i} className="animate-pulse space-y-2">
          <div className="h-4 bg-zinc-200 rounded w-1/2"/>
          <div className="h-3 bg-zinc-100 rounded w-3/4"/>
          <div className="h-3 bg-zinc-100 rounded w-1/3"/>
        </div>
      ))}
    </div>
  );
}

function ThreadSkeleton(){
  return (
    <div className="p-4 space-y-4">
      {Array.from({length:5}).map((_,i)=> (
        <div key={i} className={clsx("flex", i%2?"justify-end":"justify-start")}>
          <div className="animate-pulse bg-zinc-100 rounded-2xl h-16 w-2/3"/>
        </div>
      ))}
    </div>
  );
}

function EmptyState({ icon:Icon, title, subtitle }:{ icon:LucideIcon; title:string; subtitle:string }){
  return (
    <div className="py-16 text-center text-zinc-500">
      <Icon className="h-6 w-6 mx-auto mb-3"/>
      <div className="font-medium">{title}</div>
      <div className="text-sm">{subtitle}</div>
    </div>
  );
}

function PrinterIcon(){
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9V2h12v7"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v8H6z"/></svg>
  );
}
