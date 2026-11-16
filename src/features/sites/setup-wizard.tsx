import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getQuestions,
  makeBrief,
  removeImage,
  startRun,
  uploadImage,
  type BriefSummary,
  type Contact,
  type Direction,
  type QuestionsResult,
  type SiteDetail,
  type SiteImage,
} from "./data/api";
import { DirectionCard } from "./direction-card";
import { ExampleDialog } from "./example-dialog";
import { siteErrorText } from "./errors";

type SetupWizardProps = {
  site: SiteDetail;
  onStarted: () => void;
};

const EMPTY_CONTACT: Contact = {
  phone: "",
  whatsapp: "",
  email: "",
  address: "",
  hours: "",
};

// Kinds of website that are an occasion (an invitation, an event), not a business.
const OCCASIONS = new Set([
  "wedding",
  "engagement",
  "anniversary",
  "event",
  "celebration",
]);
const COUPLES = new Set(["wedding", "engagement", "anniversary"]);
// Labels of "what we understood" that name a place.
const PLACE_LABEL = /^(tempat|lokasi|alamat|place|venue|location|address)/i;

/**
 * Describe, answer, choose a look, confirm: the only questions a person is asked before
 * the website is made. Every question is a choice; nothing technical is asked.
 */
export function SetupWizard({ site, onStarted }: SetupWizardProps) {
  const { t } = useTranslation();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<QuestionsResult | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [extra, setExtra] = useState("");
  const [name, setName] = useState(site.brief?.name ?? "");
  const [contact, setContact] = useState<Contact>(
    site.brief?.contact ?? EMPTY_CONTACT,
  );
  const [images, setImages] = useState<SiteImage[]>(site.images ?? []);
  const [direction, setDirection] = useState(site.design_direction);
  const [variant, setVariant] = useState(site.design_variant ?? "");
  const [language, setLanguage] = useState<"id" | "en">(site.language);
  const [other, setOther] = useState<Record<string, string>>({});
  const [example, setExample] = useState<Direction | null>(null);
  const [showAll, setShowAll] = useState(false);
  const [brief, setBrief] = useState<BriefSummary | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);

  const load = async () => {
    setLoadError(null);
    try {
      const result = await getQuestions(site.id);
      setData(result);
      if (!site.brief?.name && result.suggested_name)
        setName(result.suggested_name);
      if (!site.brief) {
        setLanguage(result.language);
        // Contact details the description already gave are filled in, not asked again.
        setContact((current) => ({
          phone: current.phone || result.known_contact?.phone || "",
          whatsapp: current.whatsapp || result.known_contact?.whatsapp || "",
          email: current.email || result.known_contact?.email || "",
          address:
            current.address ||
            result.known_contact?.address ||
            result.understood?.find((fact) => PLACE_LABEL.test(fact.label))
              ?.value ||
            "",
          hours: current.hours || result.known_contact?.hours || "",
        }));
      }
    } catch (error) {
      setLoadError(siteErrorText(t, error));
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [site.id]);

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  const occasion = OCCASIONS.has(data?.kind ?? site.kind);
  const couple = COUPLES.has(data?.kind ?? site.kind);
  const steps = [
    t("siteBuilder.wizard.stepQuestions"),
    occasion
      ? t("siteBuilder.wizard.stepDetailsEvent")
      : t("siteBuilder.wizard.stepDetails"),
    t("siteBuilder.wizard.stepLook"),
    t("siteBuilder.wizard.stepSummary"),
  ];

  const toggle = (questionId: string, option: string, multiple: boolean) => {
    setAnswers((current) => {
      const chosen = current[questionId] ?? [];
      if (!multiple)
        return {
          ...current,
          [questionId]: chosen[0] === option ? [] : [option],
        };
      return {
        ...current,
        [questionId]: chosen.includes(option)
          ? chosen.filter((item) => item !== option)
          : [...chosen, option],
      };
    });
  };

  const goToLook = () => {
    if (!name.trim()) {
      setProblem(t("siteBuilder.wizard.nameRequired"));
      return;
    }
    setProblem(null);
    setStep(2);
  };

  const plan = async () => {
    if (!direction) {
      setProblem(t("siteBuilder.wizard.lookRequired"));
      return;
    }
    setProblem(null);
    setBusy(true);
    try {
      const withOther = { ...answers };
      for (const [questionId, text] of Object.entries(other)) {
        if (text.trim())
          withOther[questionId] = [
            ...(withOther[questionId] ?? []),
            text.trim(),
          ];
      }
      setBrief(
        await makeBrief(site.id, {
          name: name.trim(),
          answers: withOther,
          extra,
          contact,
          direction,
          variant,
          language,
        }),
      );
      setStep(3);
    } catch (error) {
      setProblem(siteErrorText(t, error));
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    setBusy(true);
    try {
      await startRun(site.id, { kind: "create" });
      toast.success(t("siteBuilder.toast.started"));
      onStarted();
    } catch (error) {
      setProblem(siteErrorText(t, error));
    } finally {
      setBusy(false);
    }
  };

  if (loadError) {
    return (
      <Card role="alert">
        <CardContent className="py-10 text-center">
          <p className="font-medium">
            {t("siteBuilder.wizard.questionsError")}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          <Button
            className="mt-4"
            variant="outline"
            onClick={() => void load()}
          >
            {t("siteBuilder.retry")}
          </Button>
        </CardContent>
      </Card>
    );
  }
  if (!data) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        {t("siteBuilder.wizard.loadingQuestions")}
      </p>
    );
  }

  const looks: Direction[] = showAll ? data.all_directions : data.directions;
  const chosenDirection =
    looks.find((item) => item.key === direction) ??
    data.all_directions.find((item) => item.key === direction);
  const choose = (item: Direction) => {
    setDirection(item.key);
    setVariant(item.variant);
  };

  return (
    <div className="space-y-6">
      <nav aria-label={t("siteBuilder.wizard.steps")}>
        <ol className="flex flex-wrap gap-2">
          {steps.map((label, index) => (
            <li
              key={label}
              aria-current={index === step ? "step" : undefined}
              className={cn(
                "rounded-full border px-3 py-1 text-xs",
                index === step
                  ? "border-primary bg-primary text-primary-foreground"
                  : index < step
                    ? "border-border text-foreground"
                    : "border-border text-muted-foreground",
              )}
            >
              {index + 1}. {label}
            </li>
          ))}
        </ol>
        <p className="sr-only">
          {t("siteBuilder.wizard.stepOf", {
            current: step + 1,
            total: steps.length,
          })}
        </p>
      </nav>

      <Card>
        <CardContent className="space-y-6">
          {step === 0 ? (
            <section className="space-y-6">
              {data.understood && data.understood.length > 0 ? (
                <div className="space-y-2 rounded-lg border bg-muted/50 p-4">
                  <h2
                    ref={data.questions.length === 0 ? headingRef : undefined}
                    tabIndex={-1}
                    className="text-base font-semibold outline-none"
                  >
                    {t("siteBuilder.wizard.understoodTitle")}
                  </h2>
                  <dl className="space-y-1 text-sm">
                    {data.understood.map((fact) => (
                      <div
                        key={fact.label + fact.value}
                        className="flex flex-wrap gap-x-2"
                      >
                        <dt className="text-muted-foreground">{fact.label}:</dt>
                        <dd>{fact.value}</dd>
                      </div>
                    ))}
                  </dl>
                  <p className="text-xs text-muted-foreground">
                    {t("siteBuilder.wizard.understoodHelp")}
                  </p>
                </div>
              ) : null}
              {data.questions.length > 0 ? (
                <Heading
                  refObject={headingRef}
                  title={t("siteBuilder.wizard.questionsTitle")}
                  help={t("siteBuilder.wizard.questionsHelp")}
                />
              ) : (
                <p className="text-sm">{t("siteBuilder.wizard.noQuestions")}</p>
              )}
              {data.questions.map((question) =>
                question.free ? (
                  <div key={question.id} className="space-y-2">
                    <Label htmlFor={`site-q-${question.id}`}>
                      {question.text}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        ({t("siteBuilder.wizard.optional")})
                      </span>
                    </Label>
                    <Textarea
                      id={`site-q-${question.id}`}
                      value={(answers[question.id] ?? [""])[0]}
                      maxLength={1500}
                      rows={4}
                      placeholder={t("siteBuilder.wizard.freePlaceholder")}
                      onChange={(event) =>
                        setAnswers({
                          ...answers,
                          [question.id]: event.target.value.trim()
                            ? [event.target.value]
                            : [],
                        })
                      }
                    />
                  </div>
                ) : (
                  <fieldset key={question.id} className="space-y-2">
                    <legend className="text-sm font-medium">
                      {question.text}
                    </legend>
                    <p className="text-xs text-muted-foreground">
                      {question.multiple
                        ? t("siteBuilder.wizard.chooseMany")
                        : t("siteBuilder.wizard.chooseOne")}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {question.options.map((option) => {
                        const pressed = (answers[question.id] ?? []).includes(
                          option,
                        );
                        return (
                          <Button
                            key={option}
                            type="button"
                            size="sm"
                            variant={pressed ? "default" : "outline"}
                            aria-pressed={pressed}
                            onClick={() =>
                              toggle(question.id, option, question.multiple)
                            }
                          >
                            {option}
                          </Button>
                        );
                      })}
                      <Button
                        type="button"
                        size="sm"
                        variant={
                          other[question.id] !== undefined
                            ? "default"
                            : "outline"
                        }
                        aria-pressed={other[question.id] !== undefined}
                        onClick={() =>
                          setOther((current) => {
                            const next = { ...current };
                            if (next[question.id] === undefined)
                              next[question.id] = "";
                            else delete next[question.id];
                            return next;
                          })
                        }
                      >
                        {t("siteBuilder.wizard.other")}
                      </Button>
                    </div>
                    {other[question.id] !== undefined ? (
                      <Input
                        aria-label={`${question.text} ${t("siteBuilder.wizard.otherLabel")}`}
                        placeholder={t("siteBuilder.wizard.otherLabel")}
                        value={other[question.id]}
                        maxLength={200}
                        onChange={(event) =>
                          setOther({
                            ...other,
                            [question.id]: event.target.value,
                          })
                        }
                      />
                    ) : null}
                  </fieldset>
                ),
              )}
              <div className="space-y-2">
                <Label htmlFor="site-extra">
                  {t("siteBuilder.wizard.extraLabel")}{" "}
                  <span className="text-xs font-normal text-muted-foreground">
                    ({t("siteBuilder.wizard.optional")})
                  </span>
                </Label>
                <Textarea
                  id="site-extra"
                  value={extra}
                  maxLength={1000}
                  onChange={(event) => setExtra(event.target.value)}
                  placeholder={t("siteBuilder.wizard.extraPlaceholder")}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={() => setStep(1)}>
                  {t("siteBuilder.wizard.next")}
                </Button>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="space-y-6">
              <Heading
                refObject={headingRef}
                title={
                  occasion
                    ? t("siteBuilder.wizard.detailsTitleEvent")
                    : t("siteBuilder.wizard.detailsTitle")
                }
                help={t("siteBuilder.wizard.detailsHelp")}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <Field
                  id="site-name"
                  label={
                    couple
                      ? t("siteBuilder.wizard.nameCouple")
                      : occasion
                        ? t("siteBuilder.wizard.nameEvent")
                        : t("siteBuilder.wizard.name")
                  }
                  className="sm:col-span-2"
                >
                  <Input
                    id="site-name"
                    value={name}
                    maxLength={100}
                    required
                    onChange={(event) => setName(event.target.value)}
                  />
                </Field>
                <Field
                  id="site-whatsapp"
                  label={t("siteBuilder.wizard.whatsapp")}
                  optional={t("siteBuilder.wizard.optional")}
                >
                  <Input
                    id="site-whatsapp"
                    type="tel"
                    inputMode="tel"
                    value={contact.whatsapp}
                    maxLength={40}
                    onChange={(event) =>
                      setContact({ ...contact, whatsapp: event.target.value })
                    }
                  />
                </Field>
                <Field
                  id="site-phone"
                  label={t("siteBuilder.wizard.phone")}
                  optional={t("siteBuilder.wizard.optional")}
                >
                  <Input
                    id="site-phone"
                    type="tel"
                    inputMode="tel"
                    value={contact.phone}
                    maxLength={40}
                    onChange={(event) =>
                      setContact({ ...contact, phone: event.target.value })
                    }
                  />
                </Field>
                <Field
                  id="site-email"
                  label={t("siteBuilder.wizard.email")}
                  optional={t("siteBuilder.wizard.optional")}
                >
                  <Input
                    id="site-email"
                    type="email"
                    value={contact.email}
                    maxLength={120}
                    onChange={(event) =>
                      setContact({ ...contact, email: event.target.value })
                    }
                  />
                </Field>
                {occasion ? null : (
                  <Field
                    id="site-hours"
                    label={t("siteBuilder.wizard.hours")}
                    optional={t("siteBuilder.wizard.optional")}
                  >
                    <Input
                      id="site-hours"
                      value={contact.hours}
                      maxLength={200}
                      placeholder={t("siteBuilder.wizard.hoursPlaceholder")}
                      onChange={(event) =>
                        setContact({ ...contact, hours: event.target.value })
                      }
                    />
                  </Field>
                )}
                <Field
                  id="site-address"
                  label={
                    occasion
                      ? t("siteBuilder.wizard.addressEvent")
                      : t("siteBuilder.wizard.address")
                  }
                  optional={t("siteBuilder.wizard.optional")}
                  className="sm:col-span-2"
                >
                  <Textarea
                    id="site-address"
                    value={contact.address}
                    maxLength={300}
                    rows={2}
                    onChange={(event) =>
                      setContact({ ...contact, address: event.target.value })
                    }
                  />
                </Field>
              </div>
              <fieldset className="space-y-2">
                <legend className="text-sm font-medium">
                  {t("siteBuilder.wizard.languageLabel")}
                </legend>
                <p className="text-xs text-muted-foreground">
                  {t("siteBuilder.wizard.languageHelp")}
                </p>
                <div className="flex flex-wrap gap-2">
                  {(["id", "en"] as const).map((code) => (
                    <Button
                      key={code}
                      type="button"
                      size="sm"
                      variant={language === code ? "default" : "outline"}
                      aria-pressed={language === code}
                      onClick={() => setLanguage(code)}
                    >
                      {code === "id"
                        ? t("siteBuilder.wizard.languageId")
                        : t("siteBuilder.wizard.languageEn")}
                    </Button>
                  ))}
                </div>
              </fieldset>
              <ImagePicker
                siteId={site.id}
                images={images}
                onChange={setImages}
                occasion={occasion}
              />
              {problem ? (
                <p role="alert" className="text-sm text-destructive">
                  {problem}
                </p>
              ) : null}
              <div className="flex justify-between gap-2">
                <Button variant="outline" onClick={() => setStep(0)}>
                  {t("siteBuilder.wizard.back")}
                </Button>
                <Button onClick={goToLook}>
                  {t("siteBuilder.wizard.next")}
                </Button>
              </div>
            </section>
          ) : null}

          {step === 2 ? (
            <section className="space-y-6">
              <Heading
                refObject={headingRef}
                title={t("siteBuilder.wizard.lookTitle")}
                help={t("siteBuilder.wizard.lookHelp")}
              />
              <div
                role="radiogroup"
                aria-label={t("siteBuilder.wizard.lookTitle")}
                className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
              >
                {looks.map((item) => (
                  <DirectionCard
                    key={item.key}
                    direction={item}
                    selected={item.key === direction}
                    onSelect={() => choose(item)}
                    onPreview={() => setExample(item)}
                  />
                ))}
              </div>
              <ExampleDialog
                direction={example}
                onOpenChange={(open) => !open && setExample(null)}
                onChoose={choose}
              />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAll(!showAll)}
              >
                {showAll
                  ? t("siteBuilder.wizard.fewerLooks")
                  : t("siteBuilder.wizard.moreLooks")}
              </Button>
              {problem ? (
                <p role="alert" className="text-sm text-destructive">
                  {problem}
                </p>
              ) : null}
              <div className="flex justify-between gap-2">
                <Button
                  variant="outline"
                  onClick={() => setStep(1)}
                  disabled={busy}
                >
                  {t("siteBuilder.wizard.back")}
                </Button>
                <Button onClick={() => void plan()} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {busy
                    ? t("siteBuilder.wizard.planning")
                    : t("siteBuilder.wizard.next")}
                </Button>
              </div>
            </section>
          ) : null}

          {step === 3 && brief ? (
            <section className="space-y-6">
              <Heading
                refObject={headingRef}
                title={t("siteBuilder.wizard.summaryTitle")}
              />
              <div className="space-y-1">
                <p className="text-base font-semibold">{brief.name}</p>
                {brief.tagline ? (
                  <p className="text-sm text-muted-foreground">
                    {brief.tagline}
                  </p>
                ) : null}
              </div>
              <p className="text-sm">{brief.summary}</p>
              <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("siteBuilder.wizard.pagesLabel")}
                  </dt>
                  <dd className="mt-1 flex flex-wrap gap-2">
                    {brief.pages.map((page) => (
                      <span
                        key={page}
                        className="rounded-md border px-2 py-1 text-sm"
                      >
                        {page}
                      </span>
                    ))}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("siteBuilder.wizard.lookLabel")}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {chosenDirection?.name}
                    {chosenDirection?.variant_name
                      ? ` (${chosenDirection.variant_name})`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    {t("siteBuilder.wizard.languageLabel")}
                  </dt>
                  <dd className="mt-1 text-sm">
                    {(brief.language ?? language) === "en"
                      ? t("siteBuilder.wizard.languageEn")
                      : t("siteBuilder.wizard.languageId")}
                  </dd>
                </div>
              </dl>
              {problem ? (
                <p role="alert" className="text-sm text-destructive">
                  {problem}
                </p>
              ) : null}
              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
                <Button
                  variant="outline"
                  onClick={() => setStep(0)}
                  disabled={busy}
                >
                  {t("siteBuilder.wizard.editAnswers")}
                </Button>
                <Button onClick={() => void create()} disabled={busy}>
                  {busy ? <Loader2 className="size-4 animate-spin" /> : null}
                  {busy
                    ? t("siteBuilder.wizard.creating")
                    : t("siteBuilder.wizard.create")}
                </Button>
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Heading({
  title,
  help,
  refObject,
}: {
  title: string;
  help?: string;
  refObject: React.RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <div>
      <h2
        ref={refObject}
        tabIndex={-1}
        className="text-base font-semibold outline-none"
      >
        {title}
      </h2>
      {help ? (
        <p className="mt-1 text-sm text-muted-foreground">{help}</p>
      ) : null}
    </div>
  );
}

function Field({
  id,
  label,
  optional,
  className,
  children,
}: {
  id: string;
  label: string;
  optional?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={cn("space-y-2", className)}>
      <Label htmlFor={id}>
        {label}{" "}
        {optional ? (
          <span className="text-xs font-normal text-muted-foreground">
            ({optional})
          </span>
        ) : null}
      </Label>
      {children}
    </div>
  );
}

/** Logo and photos, uploaded at once so the planner and the agent can use them. */
function ImagePicker({
  siteId,
  images,
  onChange,
  occasion,
}: {
  siteId: number;
  images: SiteImage[];
  onChange: (images: SiteImage[]) => void;
  occasion: boolean;
}) {
  const { t } = useTranslation();
  const logoId = useId();
  const photosId = useId();
  const [uploading, setUploading] = useState<"logo" | "photos" | null>(null);

  const upload = async (files: FileList | null, logo: boolean) => {
    if (!files || files.length === 0) return;
    setUploading(logo ? "logo" : "photos");
    try {
      let current = images;
      for (const file of Array.from(files))
        current = await uploadImage(siteId, file, logo);
      onChange(current);
    } catch (error) {
      toast.error(siteErrorText(t, error));
    } finally {
      setUploading(null);
    }
  };

  const remove = async (image: SiteImage) => {
    try {
      onChange(await removeImage(siteId, image.src));
    } catch (error) {
      toast.error(siteErrorText(t, error));
    }
  };

  const logo = images.find((image) => image.logo);
  const photos = images.filter((image) => !image.logo);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {t("siteBuilder.wizard.logo")}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({t("siteBuilder.wizard.optional")})
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {t("siteBuilder.wizard.logoHelp")}
        </p>
        {logo ? (
          <ImageChip image={logo} onRemove={() => void remove(logo)} />
        ) : null}
        <UploadButton
          id={logoId}
          label={t("siteBuilder.wizard.chooseLogo")}
          busy={uploading === "logo"}
          onFiles={(files) => void upload(files, true)}
        />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-medium">
          {t("siteBuilder.wizard.photos")}{" "}
          <span className="text-xs font-normal text-muted-foreground">
            ({t("siteBuilder.wizard.optional")})
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          {occasion
            ? t("siteBuilder.wizard.photosHelpEvent")
            : t("siteBuilder.wizard.photosHelp")}
        </p>
        <div className="flex flex-wrap gap-2">
          {photos.map((image) => (
            <ImageChip
              key={image.src}
              image={image}
              onRemove={() => void remove(image)}
            />
          ))}
        </div>
        <UploadButton
          id={photosId}
          label={t("siteBuilder.wizard.choosePhotos")}
          multiple
          busy={uploading === "photos"}
          onFiles={(files) => void upload(files, false)}
        />
      </div>
    </div>
  );
}

function ImageChip({
  image,
  onRemove,
}: {
  image: SiteImage;
  onRemove: () => void;
}) {
  const { t } = useTranslation();
  return (
    <span className="inline-flex max-w-full items-center gap-1 rounded-md border bg-muted px-2 py-1 text-xs">
      <span className="truncate">{image.alt}</span>
      <button
        type="button"
        onClick={onRemove}
        aria-label={t("siteBuilder.wizard.removeImage", { name: image.alt })}
        className="rounded-sm p-0.5 text-muted-foreground transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
      >
        <X className="size-3" />
      </button>
    </span>
  );
}

function UploadButton({
  id,
  label,
  multiple,
  busy,
  onFiles,
}: {
  id: string;
  label: string;
  multiple?: boolean;
  busy: boolean;
  onFiles: (files: FileList | null) => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      <input
        id={id}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        multiple={multiple}
        className="peer sr-only"
        disabled={busy}
        onChange={(event) => {
          onFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <label
        htmlFor={id}
        className="inline-flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-ring hover:bg-accent"
      >
        {busy ? (
          <Loader2 className="size-4 animate-spin" />
        ) : (
          <ImagePlus className="size-4" />
        )}
        {busy ? t("siteBuilder.wizard.uploading") : label}
      </label>
    </div>
  );
}
