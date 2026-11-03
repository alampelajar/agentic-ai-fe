import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { AlertCircle, CheckCircle2, Clock3, FileText, MessageSquareText, Paperclip, Send, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { apiFetch } from "@/lib/api";

type Status = "new" | "processing" | "completed" | "rejected";
type Reply = { id: number; message: string; created_at: string };
type Report = { id: number; category: string; subject: string; description: string; rating: number; rating_reasons?: string[]; rating_comment?: string; related_page: string; attachment: string; status: Status; created_at: string; replies: Reply[] };
type RatingDraft = { rating: number; reasons: string[]; comment: string };
const ratingReasons = ["admin_ramah", "pengerjaan_cepat", "solusi_tepat", "komunikasi_jelas", "responsif", "masalah_terselesaikan"] as const;
const categories = ["feature", "bug", "service", "aiExperience", "help"] as const;

function FeedbackPage() {
  const { t } = useTranslation();
  const [reports, setReports] = useState<Report[]>([]);
  const [tab, setTab] = useState<"form" | "history">("form");
  const [category, setCategory] = useState(""), [subject, setSubject] = useState(""), [description, setDescription] = useState("");
  const [page, setPage] = useState(""), [attachment, setAttachment] = useState<File | null>(null);
  const [submitted, setSubmitted] = useState(false), [loading, setLoading] = useState(true), [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [ratingDrafts, setRatingDrafts] = useState<Record<number, RatingDraft>>({});
  const [savingRating, setSavingRating] = useState<number | null>(null);
  const [ratingSuccess, setRatingSuccess] = useState("");
  const [editingRatingId, setEditingRatingId] = useState<number | null>(null);

  async function loadReports() {
    setLoading(true);
    setError("");
    try {
      const response = await apiFetch("/api/feedback");
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Gagal mengambil riwayat feedback.");
      setReports(Array.isArray(result.feedback) ? result.feedback : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengambil riwayat feedback.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadReports(); }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!category || !page.trim() || !description.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const response = await apiFetch("/api/feedback", {
        method: "POST",
        body: JSON.stringify({
          category,
          subject: subject.trim(),
          description: description.trim(),
          related_page: page.trim(),
          attachment: attachment?.name || "",
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Gagal mengirim feedback.");
      setSubject(""); setDescription(""); setPage(""); setAttachment(null);
      setSubmitted(true); setTab("history");
      await loadReports();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengirim feedback.");
    } finally {
      setSubmitting(false);
    }
  }

  function getRatingDraft(report: Report): RatingDraft {
    return ratingDrafts[report.id] || {
      rating: report.rating || 0,
      reasons: report.rating_reasons || [],
      comment: report.rating_comment || "",
    };
  }

  function updateRatingDraft(report: Report, patch: Partial<RatingDraft>) {
    setRatingDrafts((current) => {
      const existing = current[report.id] || {
        rating: report.rating || 0,
        reasons: report.rating_reasons || [],
        comment: report.rating_comment || "",
      };
      return { ...current, [report.id]: { ...existing, ...patch } };
    });
  }

  async function saveRating(reportId: number, draft: RatingDraft) {
    if (draft.rating < 1 || draft.rating > 5) {
      setError(t("feedbackPage.ratingRequired"));
      return;
    }
    if (draft.comment.trim() && draft.comment.trim().length < 10) {
      setError(t("feedbackPage.reasonMinLength"));
      return;
    }
    setSavingRating(reportId);
    setError("");
    setRatingSuccess("");
    try {
      const response = await apiFetch(`/api/feedback/${reportId}/rating`, {
        method: "PATCH",
        body: JSON.stringify({
          rating: draft.rating,
          rating_reasons: draft.reasons,
          rating_comment: draft.comment.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.message || "Gagal menyimpan rating.");
      setReports((current) => current.map((report) => report.id === reportId
        ? { ...report, rating: draft.rating, rating_reasons: draft.reasons, rating_comment: draft.comment.trim() }
        : report));
      setRatingDrafts((current) => ({
        ...current,
        [reportId]: { ...draft, comment: draft.comment.trim() },
      }));
      setRatingSuccess(t("feedbackPage.ratingSubmitSuccess"));
      setEditingRatingId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan rating.");
    } finally {
      setSavingRating(null);
    }
  }

  const openCount = reports.filter((r) => r.status === "new" || r.status === "processing").length;
  const doneCount = reports.filter((r) => r.status === "completed").length;
  return <main className="mx-auto w-full max-w-6xl space-y-6 p-4 md:p-6">
    <header className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"><div className="space-y-2"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><MessageSquareText className="size-5" /></div><h1 className="text-2xl font-semibold tracking-tight">{t("feedbackPage.title")}</h1><p className="max-w-2xl text-sm text-muted-foreground">{t("feedbackPage.subtitle")}</p></div>
    <div className="grid grid-cols-3 gap-2 sm:min-w-72">{[["feedbackPage.totalReports", reports.length], ["feedbackPage.inProgress", openCount], ["feedbackPage.completed", doneCount]].map(([label, value]) => <Card key={String(label)} className="gap-2 py-4"><CardContent className="px-3"><p className="text-xs text-muted-foreground">{t(String(label))}</p><p className="mt-1 text-2xl font-semibold">{value}</p></CardContent></Card>)}</div></header>
    <nav className="flex gap-2 border-b"><button type="button" onClick={() => { setTab("form"); setSubmitted(false); }} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === "form" ? "border-primary" : "border-transparent text-muted-foreground"}`}>{t("feedbackPage.newReport")}</button><button type="button" onClick={() => setTab("history")} className={`border-b-2 px-4 py-3 text-sm font-medium ${tab === "history" ? "border-primary" : "border-transparent text-muted-foreground"}`}>{t("feedbackPage.history")} <span className="ms-1 rounded-full bg-muted px-2 py-0.5 text-xs">{reports.length}</span></button></nav>
    {ratingSuccess && <div role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3 text-sm text-emerald-700 dark:text-emerald-400">{ratingSuccess}</div>}
    {error && <div role="alert" className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"><AlertCircle className="size-4 shrink-0" />{error}</div>}
    {submitted && <div role="status" className="flex gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm"><CheckCircle2 className="size-5 shrink-0 text-emerald-600" /><div><p className="font-medium">{t("feedbackPage.submitSuccess")}</p></div></div>}
    {tab === "form" ? <Card><CardHeader><CardTitle>{t("feedbackPage.formTitle")}</CardTitle><CardDescription>{t("feedbackPage.formDescription")}</CardDescription></CardHeader><CardContent><form onSubmit={submit} className="space-y-6">
      <div className="grid gap-5 md:grid-cols-2"><div className="space-y-2"><label htmlFor="fb-category" className="text-sm font-medium">{t("feedbackPage.category")}</label><select id="fb-category" value={category} onChange={(e) => setCategory(e.target.value)} required className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"><option value="" disabled>{t("feedbackPage.selectCategory")}</option>{categories.map((item) => <option key={item} value={item}>{t(`feedbackPage.categories.${item}`)}</option>)}</select></div><div className="space-y-2"><label htmlFor="fb-page" className="text-sm font-medium">{t("feedbackPage.relatedPage")}</label><Input id="fb-page" value={page} onChange={(e) => setPage(e.target.value)} placeholder={t("feedbackPage.relatedPagePlaceholder")} required /></div></div>
      <div className="space-y-2"><label htmlFor="fb-subject" className="text-sm font-medium">{t("feedbackPage.subject")}</label><Input id="fb-subject" value={subject} onChange={(e) => setSubject(e.target.value)} maxLength={120} placeholder={t("feedbackPage.subjectPlaceholder")} /></div>
      <div className="space-y-2"><label htmlFor="fb-description" className="text-sm font-medium">{t("feedbackPage.description")}</label><Textarea id="fb-description" value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} rows={6} maxLength={5000} placeholder={t("feedbackPage.descriptionPlaceholder")} required /><p className="text-right text-xs text-muted-foreground">{description.length}/5000</p></div>
      <div className="space-y-2"><label htmlFor="fb-file" className="text-sm font-medium">{t("feedbackPage.attachment")}</label><label htmlFor="fb-file" className="flex cursor-pointer items-center gap-3 rounded-lg border border-dashed p-4 hover:bg-muted/50"><span className="flex size-10 items-center justify-center rounded-lg bg-muted"><Paperclip className="size-5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{attachment?.name || t("feedbackPage.attachmentPrompt")}</span><span className="text-xs text-muted-foreground">{t("feedbackPage.attachmentHelp")}</span></span><span className="text-sm font-medium text-primary">{t("feedbackPage.browse")}</span></label><input id="fb-file" type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => setAttachment(e.target.files?.[0] || null)} /><p className="text-xs text-muted-foreground">{t("feedbackPage.attachmentPrototypeNotice")}</p></div>
      <div className="flex flex-col-reverse gap-3 border-t pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{t("feedbackPage.requiredFields")}</p><Button type="submit" disabled={submitting} className="gap-2"><Send className="size-4" />{submitting ? t("feedbackPage.submitting") : t("feedbackPage.submit")}</Button></div>
    </form></CardContent></Card> : <Card><CardHeader><CardTitle>{t("feedbackPage.historyTitle")}</CardTitle><CardDescription>{t("feedbackPage.historyDescription")}</CardDescription></CardHeader><CardContent>{loading ? <p className="py-10 text-center text-sm text-muted-foreground">{t("feedbackPage.loading")}</p> : reports.length === 0 ? <div className="flex flex-col items-center rounded-xl border border-dashed px-6 py-14 text-center"><FileText className="mb-4 size-8 text-muted-foreground" /><h3 className="font-medium">{t("feedbackPage.emptyTitle")}</h3><p className="mt-1 max-w-sm text-sm text-muted-foreground">{t("feedbackPage.emptyDescription")}</p><Button className="mt-5" onClick={() => setTab("form")}>{t("feedbackPage.createFirst")}</Button></div> : <div className="space-y-4">{reports.map((r) => <article key={r.id} className="rounded-xl border p-4 sm:p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0 space-y-2"><div className="flex flex-wrap items-center gap-2"><span className="rounded-md bg-muted px-2 py-1 text-xs font-medium">FB-{r.id}</span><span className="text-xs text-muted-foreground">{t(`feedbackPage.categories.${r.category}`)}</span></div><h3 className="font-semibold">{r.subject || t("feedbackPage.noSubject")}</h3><p className="whitespace-pre-wrap text-sm text-muted-foreground">{r.description}</p></div><span className={`inline-flex shrink-0 items-center gap-1.5 self-start rounded-full px-2.5 py-1 text-xs font-medium ${r.status === "completed" ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400" : r.status === "rejected" ? "bg-destructive/10 text-destructive" : "bg-amber-500/10 text-amber-700 dark:text-amber-400"}`}>{r.status === "completed" ? <CheckCircle2 className="size-3.5" /> : r.status === "rejected" ? <AlertCircle className="size-3.5" /> : <Clock3 className="size-3.5" />}{t(`feedbackPage.statuses.${r.status}`)}</span></div><div className="mt-4 flex flex-wrap gap-3 border-t pt-3 text-xs text-muted-foreground"><span>{new Date(r.created_at).toLocaleString()}</span>{r.related_page && <span>{t("feedbackPage.relatedPage")}: {r.related_page}</span>}{r.rating > 0 && <span>{t("feedbackPage.ratingValue", { count: r.rating })}</span>}{r.attachment && <span className="inline-flex items-center gap-1"><Paperclip className="size-3" />{r.attachment}</span>}</div><div className="mt-4 rounded-lg bg-muted/50 p-3 text-sm"><p className="font-medium">{t("feedbackPage.adminReply")}</p>{r.replies?.length ? <div className="mt-2 space-y-2">{r.replies.map((reply) => <div key={reply.id} className="whitespace-pre-wrap text-muted-foreground">{reply.message}<p className="mt-1 text-xs">{new Date(reply.created_at).toLocaleString()}</p></div>)}</div> : <p className="mt-1 text-muted-foreground">{t("feedbackPage.noReplyYet")}</p>}</div>{r.status === "completed" && (() => {
        const draft = getRatingDraft(r);
        const isEditing = r.rating === 0 || editingRatingId === r.id;
        return <div className="mt-4 space-y-4 border-t pt-4">
          <div><p className="text-sm font-semibold">{t("feedbackPage.rateCompleted")}</p><p className="mt-1 text-xs text-muted-foreground">{t("feedbackPage.ratingOptional")}</p>
            <div className="mt-2 flex items-center gap-1">{[1,2,3,4,5].map((n) => <button key={n} type="button" aria-label={t("feedbackPage.starRating", { count: n })} aria-pressed={draft.rating === n} onClick={() => updateRatingDraft(r, { rating: n })} disabled={!isEditing} className="rounded-md disabled:cursor-default p-1 focus-visible:ring-2 focus-visible:ring-ring"><Star className={`size-7 ${n <= draft.rating ? "fill-amber-400 text-amber-500" : "text-muted-foreground/40"}`} /></button>)}{draft.rating > 0 && <span className="ms-2 text-sm text-muted-foreground">{t("feedbackPage.ratingValue", { count: draft.rating })}</span>}</div>
          </div>
          <div className="space-y-2"><p className="text-sm font-medium">{t("feedbackPage.reasonOptions")}</p><p className="text-xs text-muted-foreground">{t("feedbackPage.reasonOptionsHelp")}</p>
            <div className="flex flex-wrap gap-2">{ratingReasons.map((reason) => {
              const active = draft.reasons.includes(reason);
              return <button key={reason} type="button" aria-pressed={active} onClick={() => updateRatingDraft(r, { reasons: active ? draft.reasons.filter((value) => value !== reason) : [...draft.reasons, reason] })} disabled={!isEditing} className={`rounded-full disabled:cursor-default border px-3 py-1.5 text-xs transition ${active ? "border-primary bg-primary/10 text-primary" : "border-input text-muted-foreground hover:bg-muted"}`}>{t(`feedbackPage.reasons.${reason}`)}</button>;
            })}</div>
          </div>
          <div className="space-y-2"><label htmlFor={`rating-comment-${r.id}`} className="text-sm font-medium">{t("feedbackPage.manualReason")}</label><Textarea id={`rating-comment-${r.id}`} value={draft.comment} onChange={(e) => updateRatingDraft(r, { comment: e.target.value })} disabled={!isEditing} minLength={draft.comment.trim() ? 10 : undefined} maxLength={1000} rows={3} placeholder={t("feedbackPage.manualReasonPlaceholder")} /><p className="text-xs text-muted-foreground">{draft.comment.trim() ? t("feedbackPage.reasonMinLength") : t("feedbackPage.manualReasonOptional")} · {draft.comment.length}/1000</p></div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>{r.rating > 0 ? <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="size-3.5" />{t("feedbackPage.ratingDone")}</span> : <p className="text-xs text-muted-foreground">{t("feedbackPage.ratingNotSaved")}</p>}</div>
            {r.rating > 0 && !isEditing ? <Button type="button" variant="outline" onClick={() => { setEditingRatingId(r.id); setRatingSuccess(""); }}>{t("feedbackPage.editRating")}</Button> : <div className="flex items-center gap-2">
              {r.rating > 0 && <Button type="button" variant="outline" onClick={() => { setEditingRatingId(null); setRatingDrafts((current) => ({ ...current, [r.id]: { rating: r.rating, reasons: r.rating_reasons || [], comment: r.rating_comment || "" } })); }}>{t("feedbackPage.cancelEdit")}</Button>}
              <Button type="button" disabled={savingRating === r.id || draft.rating < 1 || (draft.comment.trim().length > 0 && draft.comment.trim().length < 10)} onClick={() => saveRating(r.id, draft)}>{savingRating === r.id ? t("feedbackPage.savingRating") : t(r.rating > 0 ? "feedbackPage.saveRatingChanges" : "feedbackPage.saveRating")}</Button>
            </div>}
          </div>
        </div>;
      })()}</article>)}<div className="text-center"><Button variant="outline" onClick={() => setTab("form")}>{t("feedbackPage.sendAnother")}</Button></div></div>}</CardContent></Card>}
    <p className="text-center text-xs text-muted-foreground">{t("feedbackPage.footerNote")}</p>
  </main>;
}
export const Route = createFileRoute("/_authenticated/feedback")({ component: FeedbackPage });
