import React from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";


import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { SelectDropdown } from "@/components/select-dropdown";
import { type Task } from "../data/schema";
import { useTasks } from "./tasks-provider";

type TaskMutateDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentRow?: Task;
};

export function TasksMutateDrawer({
  open,
  onOpenChange,
  currentRow,
}: TaskMutateDrawerProps) {
  const { t } = useTranslation();

  const isUpdate = !!currentRow;
  const { create, update } = useTasks();
  const [saving, setSaving] = React.useState(false);

  const formSchema = z.object({
    title: z.string().min(1, t("tasksPage.validation.title")),
    status: z.string().min(1, t("tasksPage.validation.status")),
    label: z.string().min(1, t("tasksPage.validation.label")),
    priority: z.string().min(1, t("tasksPage.validation.priority")),
  });

  type TaskForm = z.infer<typeof formSchema>;

  const form = useForm<TaskForm>({
    resolver: zodResolver(formSchema),
    defaultValues: currentRow ?? {
      title: "",
      status: "",
      label: "",
      priority: "",
    },
  });

  const onSubmit = async (data: TaskForm) => {
    setSaving(true);
    try {
      if (isUpdate && currentRow) {
        await update(currentRow.id, data);
      } else {
        await create(data);
      }
      onOpenChange(false);
      form.reset();
    } catch (err) {
      form.setError("root", {
        message: err instanceof Error ? err.message : t("tasksPage.saveError"),
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        form.reset();
      }}
    >
      <SheetContent className="flex flex-col">
        <SheetHeader className="text-start">
          <SheetTitle>
            {isUpdate ? t("tasksPage.updateTask") : t("tasksPage.createTask")}
          </SheetTitle>

          <SheetDescription>
            {isUpdate
              ? t("tasksPage.updateDescription")
              : t("tasksPage.createDescription")}{" "}
            {t("tasksPage.saveInstruction")}
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            id="tasks-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="flex-1 space-y-6 overflow-y-auto px-4"
          >
            {form.formState.errors.root?.message && (
              <p className="text-sm text-destructive">{form.formState.errors.root.message}</p>
            )}

            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasksPage.titleField")}</FormLabel>

                  <FormControl>
                    <Input
                      disabled={saving}
                      {...field}
                      placeholder={t("tasksPage.titlePlaceholder")}
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Status */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("tasksPage.status")}</FormLabel>

                  <SelectDropdown
                    defaultValue={field.value}
                    onValueChange={field.onChange}
                    disabled={saving}
                    placeholder={t("tasksPage.selectStatus")}
                    items={[
                      {
                        label: t("tasksPage.statuses.in progress"),
                        value: "in progress",
                      },
                      {
                        label: t("tasksPage.statuses.backlog"),
                        value: "backlog",
                      },
                      {
                        label: t("tasksPage.statuses.todo"),
                        value: "todo",
                      },
                      {
                        label: t("tasksPage.statuses.canceled"),
                        value: "canceled",
                      },
                      {
                        label: t("tasksPage.statuses.done"),
                        value: "done",
                      },
                    ]}
                  />

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Label */}
            <FormField
              control={form.control}
              name="label"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>{t("tasksPage.labels")}</FormLabel>

                  <FormControl>
                    <RadioGroup
                      disabled={saving}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center">
                        <FormControl>
                          <RadioGroupItem value="documentation" />
                        </FormControl>

                        <FormLabel className="font-normal">
                          {t("tasksPage.labelsList.documentation")}
                        </FormLabel>
                      </FormItem>

                      <FormItem className="flex items-center">
                        <FormControl>
                          <RadioGroupItem value="feature" />
                        </FormControl>

                        <FormLabel className="font-normal">
                          {t("tasksPage.labelsList.feature")}
                        </FormLabel>
                      </FormItem>

                      <FormItem className="flex items-center">
                        <FormControl>
                          <RadioGroupItem value="bug" />
                        </FormControl>

                        <FormLabel className="font-normal">
                          {t("tasksPage.labelsList.bug")}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Priority */}
            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem className="relative">
                  <FormLabel>{t("tasksPage.priority")}</FormLabel>

                  <FormControl>
                    <RadioGroup
                      disabled={saving}
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-1"
                    >
                      <FormItem className="flex items-center">
                        <FormControl>
                          <RadioGroupItem value="high" />
                        </FormControl>

                        <FormLabel className="font-normal">
                          {t("tasksPage.priorities.high")}
                        </FormLabel>
                      </FormItem>

                      <FormItem className="flex items-center">
                        <FormControl>
                          <RadioGroupItem value="medium" />
                        </FormControl>

                        <FormLabel className="font-normal">
                          {t("tasksPage.priorities.medium")}
                        </FormLabel>
                      </FormItem>

                      <FormItem className="flex items-center">
                        <FormControl>
                          <RadioGroupItem value="low" />
                        </FormControl>

                        <FormLabel className="font-normal">
                          {t("tasksPage.priorities.low")}
                        </FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <SheetFooter className="gap-2">
          <SheetClose asChild>
            <Button variant="outline" disabled={saving}>{t("tasksPage.close")}</Button>
          </SheetClose>

          <Button form="tasks-form" type="submit" disabled={saving}>
            {saving ? t("tasksPage.saving") : t("tasksPage.saveChanges")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
