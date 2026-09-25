import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslation } from "react-i18next";

import { showSubmittedData } from "@/lib/show-submitted-data";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

type TaskImportDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TasksImportDialog({
  open,
  onOpenChange,
}: TaskImportDialogProps) {
  const { t } = useTranslation();

  const formSchema = z.object({
    file: z
      .instanceof(FileList)
      .refine((files) => files.length > 0, {
        message: t("tasksPage.import.validationRequired"),
      })
      .refine(
        (files) => ["text/csv"].includes(files?.[0]?.type),
        t("tasksPage.import.validationFormat"),
      ),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { file: undefined },
  });

  const fileRef = form.register("file");

  const onSubmit = () => {
    const file = form.getValues("file");

    if (file && file[0]) {
      const fileDetails = {
        name: file[0].name,
        size: file[0].size,
        type: file[0].type,
      };

      showSubmittedData(fileDetails, t("tasksPage.import.success"));
    }

    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        onOpenChange(value);
        form.reset();
      }}
    >
      <DialogContent className="gap-2 sm:max-w-sm">
        <DialogHeader className="text-start">
          <DialogTitle>{t("tasksPage.import.title")}</DialogTitle>

          <DialogDescription>
            {t("tasksPage.import.description")}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form id="task-import-form" onSubmit={form.handleSubmit(onSubmit)}>
            <FormField
              control={form.control}
              name="file"
              render={() => (
                <FormItem className="my-2">
                  <FormLabel>{t("tasksPage.import.file")}</FormLabel>

                  <FormControl>
                    <Input
                      type="file"
                      accept="text/csv"
                      {...fileRef}
                      className="h-8 py-0"
                    />
                  </FormControl>

                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="gap-2">
          <DialogClose asChild>
            <Button variant="outline">{t("tasksPage.import.close")}</Button>
          </DialogClose>

          <Button type="submit" form="task-import-form">
            {t("tasksPage.import.import")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
