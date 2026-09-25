import { type ChangeEvent, useEffect, useState } from "react";
import { getRouteApi } from "@tanstack/react-router";
import { ArrowDownAZ, ArrowUpAZ, SlidersHorizontal } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Main } from "@/components/layout/main";
import { PageLoading } from "@/components/layout/page-loading";

import { apps } from "./data/apps";

const route = getRouteApi("/_authenticated/apps/");

type AppType = "all" | "connected" | "notConnected";



export function Apps() {
  const { t } = useTranslation();

  const {
    filter = "",
    type = "all",
    sort: initSort = "asc",
  } = route.useSearch();

  const navigate = route.useNavigate();

  const [sort, setSort] = useState<"asc" | "desc">(initSort);
  const [appType, setAppType] = useState<AppType>(type);
  const [searchTerm, setSearchTerm] = useState(filter);

  // ============================================================
  // PAGE LOADING
  // ============================================================

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  // ============================================================
  // FILTER APPS
  // ============================================================

  const filteredApps = [...apps]
    .sort((a, b) =>
      sort === "asc"
        ? a.name.localeCompare(b.name)
        : b.name.localeCompare(a.name),
    )
    .filter((app) => {
      if (appType === "connected") {
        return app.connected;
      }

      if (appType === "notConnected") {
        return !app.connected;
      }

      return true;
    })
    .filter((app) => app.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // ============================================================
  // SEARCH
  // ============================================================

  const handleSearch = (e: ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;

    setSearchTerm(value);

    navigate({
      search: (prev) => ({
        ...prev,
        filter: value || undefined,
      }),
    });
  };

  // ============================================================
  // TYPE FILTER
  // ============================================================

  const handleTypeChange = (value: AppType) => {
    setAppType(value);

    navigate({
      search: (prev) => ({
        ...prev,
        type: value === "all" ? undefined : value,
      }),
    });
  };

  // ============================================================
  // SORT
  // ============================================================

  const handleSortChange = (value: "asc" | "desc") => {
    setSort(value);

    navigate({
      search: (prev) => ({
        ...prev,
        sort: value,
      }),
    });
  };

  // ============================================================
  // PAGE LOADING
  // ============================================================

  if (loading) {
    return <PageLoading />;
  }

  // ============================================================
  // MAIN PAGE
  // ============================================================

  return (
    <Main
      fixed
      className="
        flex
        min-h-0
        flex-col
        overflow-hidden
      "
    >
      {/* ========================================================
          SCROLLABLE CONTENT
      ======================================================== */}

      <div
        className="
          min-h-0
          flex-1
          overflow-y-auto
          overflow-x-hidden
          pr-1
        "
      >
        {/* ======================================================
            HEADER
        ====================================================== */}

        <div className="mb-6">
          {/* Badge */}

          <div
            className="
              mb-3
              inline-flex
              items-center
              rounded-full
              border
              border-violet-200
              bg-violet-50
              px-3
              py-1
              text-xs
              font-medium
              text-violet-600
              dark:border-violet-800
              dark:bg-violet-950/40
              dark:text-violet-400
            "
          >
            {t("appsPage.badge")}
          </div>

          {/* Title */}

          <h1
            className="
              text-2xl
              font-bold
              tracking-tight
              sm:text-3xl
            "
          >
            {t("appsPage.title")}
          </h1>

          {/* Description */}

          <p
            className="
              mt-1
              max-w-2xl
              text-sm
              text-muted-foreground
              sm:text-base
            "
          >
            {t("appsPage.description")}
          </p>
        </div>

        {/* ======================================================
            FILTER BAR
        ====================================================== */}

        <div
          className="
            mb-4
            flex
            flex-col
            gap-3
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          {/* Search + Filter */}

          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
            "
          >
            {/* Search */}

            <Input
              placeholder={t("appsPage.filterPlaceholder")}
              className="
                h-10
                w-full
                sm:w-56
                lg:w-64
              "
              value={searchTerm}
              onChange={handleSearch}
            />

            {/* Connection Filter */}

            <Select value={appType} onValueChange={handleTypeChange}>
              <SelectTrigger
                className="
                  h-10
                  w-full
                  sm:w-40
                "
              >
                <SelectValue>{t(`appsPage.filters.${appType}`)}</SelectValue>
              </SelectTrigger>

              <SelectContent>
                <SelectItem value="all">{t("appsPage.filters.all")}</SelectItem>

                <SelectItem value="connected">{t("appsPage.filters.connected")}</SelectItem>

                <SelectItem value="notConnected">{t("appsPage.filters.notConnected")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* ==================================================
              SORT
          ================================================== */}

          <Select value={sort} onValueChange={handleSortChange}>
            <SelectTrigger
              className="
                h-10
                w-full
                sm:w-12
              "
            >
              <SlidersHorizontal size={18} />
            </SelectTrigger>

            <SelectContent align="end">
              <SelectItem value="asc">
                <div className="flex items-center gap-3">
                  <ArrowUpAZ size={16} />

                  <span>{t("appsPage.sort.ascending")}</span>
                </div>
              </SelectItem>

              <SelectItem value="desc">
                <div className="flex items-center gap-3">
                  <ArrowDownAZ size={16} />

                  <span>{t("appsPage.sort.descending")}</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* ======================================================
            SEPARATOR
        ====================================================== */}

        <Separator className="mb-4" />

        {/* ======================================================
            APPS GRID
        ====================================================== */}

        {filteredApps.length > 0 ? (
          <ul
            className="
              grid
              gap-4
              pb-12
              sm:grid-cols-2
              lg:grid-cols-3
            "
          >
            {filteredApps.map((app) => (
              <li
                key={app.name}
                className="
                  group
                  relative
                  overflow-hidden
                  rounded-xl
                  border
                  border-border
                  bg-card
                  p-5
                  transition-all
                  duration-200
                  hover:-translate-y-0.5
                  hover:shadow-lg
                "
              >
                {/* ==================================================
                    TOP COLOR LINE
                ================================================== */}

                <div
                  className={`
                    absolute
                    inset-x-0
                    top-0
                    h-1
                    ${app.connected ? "bg-emerald-500" : "bg-violet-500"}
                  `}
                />

                {/* ==================================================
                    APP HEADER
                ================================================== */}

                <div
                  className="
                    mb-6
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  {/* Logo */}

                  <div
                    className={`
                      flex
                      size-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      border
                      p-2
                      transition-transform
                      duration-200
                      group-hover:scale-105
                      ${
                        app.connected
                          ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40"
                          : "border-violet-200 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40"
                      }
                    `}
                  >
                    {app.logo}
                  </div>

                  {/* Connection Button */}

                  <Button
                    variant="outline"
                    size="sm"
                    className={`
                      rounded-lg
                      transition-colors
                      ${
                        app.connected
                          ? "border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-950"
                          : "border-violet-200 text-violet-600 hover:bg-violet-50 dark:border-violet-800 dark:text-violet-400 dark:hover:bg-violet-950"
                      }
                    `}
                  >
                    {app.connected ? t("appsPage.connected") : t("appsPage.connect")}
                  </Button>
                </div>

                {/* ==================================================
                    APP INFORMATION
                ================================================== */}

                <div>
                  <h2
                    className="
                      mb-1.5
                      font-semibold
                      tracking-tight
                    "
                  >
                    {app.name}
                  </h2>

                  <p
                    className="
                      line-clamp-2
                      text-sm
                      leading-5
                      text-muted-foreground
                    "
                  >
                    {t(app.desc)}
                  </p>
                </div>

                {/* ==================================================
                    FOOTER
                ================================================== */}

                <div
                  className="
                    mt-5
                    flex
                    items-center
                    justify-between
                    border-t
                    border-border
                    pt-4
                  "
                >
                  <span
                    className={`
                      text-xs
                      font-medium
                      ${
                        app.connected
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-violet-600 dark:text-violet-400"
                      }
                    `}
                  >
                    {app.connected ? t("appsPage.integrationActive") : t("appsPage.readyToConnect")}
                  </span>

                  <span
                    className="
                      text-xs
                      text-muted-foreground
                    "
                  >
                    {t("appsPage.aiTool")}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          /* ======================================================
             EMPTY STATE
          ====================================================== */

          <div
            className="
              flex
              min-h-[300px]
              items-center
              justify-center
            "
          >
            <div className="text-center">
              <div
                className="
                  mx-auto
                  mb-4
                  flex
                  size-12
                  items-center
                  justify-center
                  rounded-xl
                  bg-muted
                "
              >
                <SlidersHorizontal className="size-5 text-muted-foreground" />
              </div>

              <h3 className="font-semibold">{t("appsPage.empty.title")}</h3>

              <p
                className="
                  mt-1
                  text-sm
                  text-muted-foreground
                "
              >
                {t("appsPage.empty.description")}
              </p>
            </div>
          </div>
        )}

        {/* Bottom spacing */}

        <div className="h-6" />
      </div>
    </Main>
  );
}

export default Apps;

 