import { DotsHorizontalIcon } from "@radix-ui/react-icons";
import { MessageSquare } from "lucide-react";
import { type Row } from "@tanstack/react-table";
import { Trash2 } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { labels } from "../data/data";
import { taskSchema } from "../data/schema";
import { useTasks } from "./tasks-provider";

type DataTableRowActionsProps<TData> = {
  row: Row<TData>;
};

export function DataTableRowActions<TData>({
  row,
}: DataTableRowActionsProps<TData>) {
  const { t } = useTranslation();

  const task = taskSchema.parse(row.original);

  const { setOpen, setCurrentRow } = useTasks();

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="flex h-8 w-8 p-0 data-[state=open]:bg-muted"
        >
          <DotsHorizontalIcon className="h-4 w-4" />

          <span className="sr-only">{t("tasksPage.openMenu")}</span>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-40">
        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(task);
            setOpen("update");
          }}
        >
          {t("tasksPage.edit")}
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={() => {
            window.location.assign(`/ai?task=${encodeURIComponent(task.id)}`);
          }}
        >
          <MessageSquare className="mr-2 size-4" />
          {t("tasksPage.openChat")}
        </DropdownMenuItem>

        <DropdownMenuItem disabled>{t("tasksPage.makeCopy")}</DropdownMenuItem>

        <DropdownMenuItem disabled>{t("tasksPage.favorite")}</DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuSub>
          <DropdownMenuSubTrigger>
            {t("tasksPage.labels")}
          </DropdownMenuSubTrigger>

          <DropdownMenuSubContent>
            <DropdownMenuRadioGroup value={task.label}>
              {labels.map((label) => (
                <DropdownMenuRadioItem key={label.value} value={label.value}>
                  {label.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuSubContent>
        </DropdownMenuSub>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => {
            setCurrentRow(task);
            setOpen("delete");
          }}
        >
          {t("tasksPage.delete")}

          <DropdownMenuShortcut>
            <Trash2 size={16} />
          </DropdownMenuShortcut>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
