import { z } from "zod";
import { useForm } from "react-hook-form";
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

import { showSubmittedData } from "@/lib/show-submitted-data";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

/* =========================================================
   LANGUAGES
========================================================= */

const languages = [
  {
    label: "English",
    value: "en",
  },
  {
    label: "Bahasa Indonesia",
    value: "id",
  },
] as const;

/* =========================================================
   FORM SCHEMA
========================================================= */

const accountFormSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters.")
    .max(30, "Name must not be longer than 30 characters."),

  workspace: z
    .string()
    .min(2, "Workspace name must be at least 2 characters.")
    .max(50, "Workspace name must not be longer than 50 characters."),

  description: z
    .string()
    .max(160, "Description must not be longer than 160 characters.")
    .optional(),

  language: z.string().min(1, "Please select a language."),
});

/* =========================================================
   TYPES
========================================================= */

type AccountFormValues = z.infer<typeof accountFormSchema>;

/* =========================================================
   DEFAULT VALUES
========================================================= */

const defaultValues: Partial<AccountFormValues> = {
  name: "Satnaing",
  workspace: "agenticAI",
  description:
    "AI workspace untuk mengelola agent, task, tools, dan aktivitas Agentic AI.",
  language: i18n.language.startsWith("en") ? "en" : "id",
};

/* =========================================================
   COMPONENT
========================================================= */

export function AccountForm() {
  const { t } = useTranslation();

  const form = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues,
  });

  function onSubmit(data: AccountFormValues) {
    showSubmittedData(data);
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* =====================================================
            DISPLAY NAME
        ===================================================== */}

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("settingsPage.account.name")}</FormLabel>

              <FormControl>
                <Input placeholder={t("settingsPage.account.namePlaceholder")} {...field} />
              </FormControl>

              <FormDescription>
                Nama yang akan ditampilkan pada workspace Agentic AI dan
                aktivitas kamu.
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* =====================================================
            WORKSPACE
        ===================================================== */}

        <FormField
          control={form.control}
          name="workspace"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("settingsPage.account.workspace")}</FormLabel>

              <FormControl>
                <Input placeholder={t("settingsPage.account.workspacePlaceholder")} {...field} />
              </FormControl>

              <FormDescription>
                Nama workspace tempat Agent, Task, dan Tools kamu dikelola.
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* =====================================================
            DESCRIPTION
        ===================================================== */}

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("settingsPage.account.workspaceDescription")}</FormLabel>

              <FormControl>
                <Input placeholder={t("settingsPage.account.workspaceDescriptionPlaceholder")} {...field} />
              </FormControl>

              <FormDescription>
                Deskripsi singkat mengenai workspace Agentic AI kamu.
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* =====================================================
            LANGUAGE
        ===================================================== */}

        <FormField
          control={form.control}
          name="language"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>{t("settingsPage.account.language")}</FormLabel>

              <Popover>
                <PopoverTrigger asChild>
                  <FormControl>
                    <Button
                      variant="outline"
                      role="combobox"
                      className={cn(
                        "w-full justify-between sm:w-64",
                        !field.value && "text-muted-foreground",
                      )}
                    >
                      {field.value
                        ? languages.find(
                            (language) => language.value === field.value,
                          )?.label
                        : t("settingsPage.account.selectLanguage")}

                      <CaretSortIcon className="ms-2 size-4 shrink-0 opacity-50" />
                    </Button>
                  </FormControl>
                </PopoverTrigger>

                <PopoverContent className="w-64 p-0" align="start">
                  <Command>
                    <CommandInput placeholder={t("settingsPage.account.searchLanguage")} />

                    <CommandEmpty>{t("settingsPage.account.noLanguage")}</CommandEmpty>

                    <CommandGroup>
                      <CommandList>
                        {languages.map((language) => (
                          <CommandItem
                            value={language.label}
                            key={language.value}
                            onSelect={() => {
                              form.setValue("language", language.value, {
                                shouldValidate: true,
                              });
                              i18n.changeLanguage(language.value);
                            }}
                          >
                            <CheckIcon
                              className={cn(
                                "me-2 size-4",
                                language.value === field.value
                                  ? "opacity-100"
                                  : "opacity-0",
                              )}
                            />

                            {language.label}
                          </CommandItem>
                        ))}
                      </CommandList>
                    </CommandGroup>
                  </Command>
                </PopoverContent>
              </Popover>

              <FormDescription>
                Bahasa yang digunakan pada dashboard Agentic AI.
              </FormDescription>

              <FormMessage />
            </FormItem>
          )}
        />

        {/* =====================================================
            SAVE
        ===================================================== */}

        <div className="flex items-center gap-3 border-t pt-6">
          <Button type="submit">{t("settingsPage.account.saveChanges")}</Button>

          <Button type="button" variant="outline" onClick={() => form.reset()}>
            {t("common.reset")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
