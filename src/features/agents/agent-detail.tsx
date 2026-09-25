import {
  Activity,
  ArrowLeft,
  Bot,
  CheckCircle2,
  Clock3,
  Code2,
  Play,
  Sparkles,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ThemeSwitch } from "@/components/theme-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { ProfileDropdown } from "@/components/profile-dropdown";
import i18n from "@/i18n";

export function AgentDetail() {
  const { t } = useTranslation();

  return (
    <>
      <Header fixed>
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="size-4" />
          </div>

          <div>
            <p className="text-sm font-semibold">{t("agentPage.codeBuilder")}</p>

            <p className="text-xs text-muted-foreground">
              {t("agentPage.management")}
            </p>
          </div>
        </div>

        <div className="ms-auto flex items-center gap-2">
          <select
            value={i18n.language}
            onChange={(event) => i18n.changeLanguage(event.target.value)}
            className="h-9 rounded-md border bg-background px-3 text-sm"
          >
            <option value="id">🇮🇩 Indonesia</option>
            <option value="en">🇬🇧 English</option>
          </select>

          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mx-auto w-full max-w-6xl space-y-6">
          {/* Back */}
          <Button variant="ghost" asChild>
            <Link to="/users">
              <ArrowLeft className="me-2 size-4" />
              {t("agentPage.backToAgents")}
            </Link>
          </Button>

          {/* Agent Header */}
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col justify-between gap-5 md:flex-row md:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex size-14 items-center justify-center rounded-2xl border bg-muted">
                    <Bot className="size-7" />
                  </div>

                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-bold">{t("agentPage.codeBuilder")}</h1>

                      <Badge className="bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/10">
                        <span className="me-1.5 size-1.5 rounded-full bg-emerald-500" />
                        {t("status.running")}
                      </Badge>
                    </div>

                    <p className="mt-1 text-sm text-muted-foreground">
                      {t("agentPage.development")} · AG-001
                    </p>

                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                      {t("agentPage.detailDescription")}
                    </p>
                  </div>
                </div>

                <Button>
                  <Play className="me-2 size-4" />
                  {t("agentPage.runAgent")}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Statistics */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard
              icon={Activity}
              title={t("agentPage.statusTitle")}
              value={t("status.running")}
              description={t("agentPage.statusDescription")}
            />

            <StatCard
              icon={CheckCircle2}
              title={t("agentPage.completed")}
              value="12"
              description={t("agentPage.completedDescription")}
            />

            <StatCard
              icon={Clock3}
              title={t("agentPage.activeTasks")}
              value="4"
              description={t("agentPage.activeTasksDescription")}
            />

            <StatCard
              icon={Sparkles}
              title={t("agentPage.progressTitle")}
              value="78%"
              description={t("agentPage.progressDescription")}
            />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            {/* Current Task */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{t("agentPage.currentTask")}</CardTitle>

                <CardDescription>
                  {t("agentPage.currentTaskDescription")}
                </CardDescription>
              </CardHeader>

              <CardContent>
                <div className="rounded-xl border p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                      <Code2 className="size-5" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col justify-between gap-2 sm:flex-row">
                        <div>
                          <h3 className="font-semibold">
                            Build Agentic AI Dashboard
                          </h3>

                          <p className="mt-1 text-sm text-muted-foreground">
                            {t("agentPage.currentTaskText")}
                          </p>
                        </div>

                        <Badge variant="outline">{t("status.running")}</Badge>
                      </div>

                      <div className="mt-5 space-y-2">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">
                            {t("agentPage.currentProgress")}
                          </span>

                          <span className="font-medium">78%</span>
                        </div>

                        <Progress value={78} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Agent Information */}
            <Card>
              <CardHeader>
                <CardTitle>{t("agentPage.agentInformation")}</CardTitle>
              </CardHeader>

              <CardContent className="space-y-4">
                <InfoRow label={t("agentPage.agentId")} value="AG-001" />

                <InfoRow label={t("agentPage.agentType")} value={t("agentPage.development")} />

                <InfoRow label={t("agentPage.agentModel")} value={t("agentPage.aiModel")} />

                <InfoRow label={t("agentPage.createdAt")} value="12 Aug 2026" />

                <InfoRow
                  label={t("agentPage.lastActivity")}
                  value={t("agentPage.twoMinutesAgo")}
                />
              </CardContent>
            </Card>
          </div>

          {/* Workflow */}
          <Card>
            <CardHeader>
              <CardTitle>{t("agentPage.workflow")}</CardTitle>

              <CardDescription>
                {t("agentPage.workflowDescription")}
              </CardDescription>
            </CardHeader>

            <CardContent>
              <div className="flex flex-wrap items-center gap-2">
                <WorkflowStep title={t("goal")} completed />

                <Arrow />

                <WorkflowStep title={t("planning")} completed />

                <Arrow />

                <WorkflowStep title={t("coding")} active />

                <Arrow />

                <WorkflowStep title={t("testing")} />

                <Arrow />

                <WorkflowStep title={t("done")} />
              </div>
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}

function StatCard({
  icon: Icon,
  title,
  value,
  description,
}: {
  icon: React.ElementType;
  title: string;
  value: string;
  description: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>

        <div className="flex size-9 items-center justify-center rounded-lg bg-muted">
          <Icon className="size-4 text-muted-foreground" />
        </div>
      </CardHeader>

      <CardContent>
        <div className="text-2xl font-bold">{value}</div>

        <p className="mt-1 text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b pb-3 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>

      <span className="text-right text-sm font-medium">{value}</span>
    </div>
  );
}

function WorkflowStep({
  title,
  completed = false,
  active = false,
}: {
  title: string;
  completed?: boolean;
  active?: boolean;
}) {
  return (
    <div
      className={`rounded-lg border px-4 py-2 text-sm ${
        completed
          ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600"
          : active
            ? "border-primary/30 bg-primary/10 text-primary"
            : "bg-muted text-muted-foreground"
      }`}
    >
      {title}
    </div>
  );
}

function Arrow() {
  return <span className="text-muted-foreground">→</span>;
}
