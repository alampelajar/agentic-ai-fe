import { useState } from "react";
import { type Table } from "@tanstack/react-table";
import { Trash2, CircleArrowUp, ArrowUpDown, Download } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { DataTableBulkActions as BulkActionsToolbar } from "@/components/data-table";

import { priorities, statuses } from "../data/data";
import { type Task } from "../data/schema";
import { TasksMultiDeleteDialog } from "./tasks-multi-delete-dialog";
import { updateTask } from "../data/api";

type DataTableBulkActionsProps<TData> = {
  table: Table<TData>;
};

export function DataTableBulkActions<TData>({
  table,
}: DataTableBulkActionsProps<TData>) {
  const { t } = useTranslation();

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const selectedRows = table.getFilteredSelectedRowModel().rows;

  const handleBulkStatusChange = async (status: string) => {
    const selectedTasks = selectedRows.map((row) => row.original as Task);
    try {
      await Promise.all(selectedTasks.map((task) => updateTask(task.id, { status })));
      toast.success(t("tasksPage.bulk.statusUpdated", {
        status: t(`tasksPage.statuses.${status}`),
        count: selectedTasks.length,
      }));
      table.resetRowSelection();
      window.dispatchEvent(new CustomEvent("tasks:refresh"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("tasksPage.bulk.error"));
    }
  };

  const handleBulkPriorityChange = async (priority: string) => {
    const selectedTasks = selectedRows.map((row) => row.original as Task);
    try {
      await Promise.all(selectedTasks.map((task) => updateTask(task.id, { priority })));
      toast.success(t("tasksPage.bulk.priorityUpdated", {
        priority: t(`tasksPage.priorities.${priority}`),
        count: selectedTasks.length,
      }));
      table.resetRowSelection();
      window.dispatchEvent(new CustomEvent("tasks:refresh"));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("tasksPage.bulk.error"));
    }
  };

  const handleBulkExport = () => {
    const selectedTasks = selectedRows.map((row) => row.original as Task);

    toast.promise(sleep(2000), {
      loading: t("tasksPage.bulk.exporting"),

      success: () => {
        table.resetRowSelection();

        return t("tasksPage.bulk.exported", {
          count: selectedTasks.length,
        });
      },

      error: t("tasksPage.bulk.error"),
    });

    table.resetRowSelection();
  };

  return (
    <>
      <BulkActionsToolbar table={table} entityName="task">
        {/* Update Status */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label={t("tasksPage.bulk.updateStatus")}
                  title={t("tasksPage.bulk.updateStatus")}
                >
                  <CircleArrowUp />
                  <span className="sr-only">
                    {t("tasksPage.bulk.updateStatus")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>

            <TooltipContent>
              <p>{t("tasksPage.bulk.updateStatus")}</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent sideOffset={14}>
            {statuses.map((status) => (
              <DropdownMenuItem
                key={status.value}
                defaultValue={status.value}
                onClick={() => handleBulkStatusChange(status.value)}
              >
                {status.icon && (
                  <status.icon className="size-4 text-muted-foreground" />
                )}

                {t(`tasksPage.statuses.${status.value}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Update Priority */}
        <DropdownMenu>
          <Tooltip>
            <TooltipTrigger asChild>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-8"
                  aria-label={t("tasksPage.bulk.updatePriority")}
                  title={t("tasksPage.bulk.updatePriority")}
                >
                  <ArrowUpDown />
                  <span className="sr-only">
                    {t("tasksPage.bulk.updatePriority")}
                  </span>
                </Button>
              </DropdownMenuTrigger>
            </TooltipTrigger>

            <TooltipContent>
              <p>{t("tasksPage.bulk.updatePriority")}</p>
            </TooltipContent>
          </Tooltip>

          <DropdownMenuContent sideOffset={14}>
            {priorities.map((priority) => (
              <DropdownMenuItem
                key={priority.value}
                defaultValue={priority.value}
                onClick={() => handleBulkPriorityChange(priority.value)}
              >
                {priority.icon && (
                  <priority.icon className="size-4 text-muted-foreground" />
                )}

                {t(`tasksPage.priorities.${priority.value}`)}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Export */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              onClick={handleBulkExport}
              className="size-8"
              aria-label={t("tasksPage.bulk.exportTasks")}
              title={t("tasksPage.bulk.exportTasks")}
            >
              <Download />

              <span className="sr-only">{t("tasksPage.bulk.exportTasks")}</span>
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            <p>{t("tasksPage.bulk.exportTasks")}</p>
          </TooltipContent>
        </Tooltip>

        {/* Delete */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="destructive"
              size="icon"
              onClick={() => setShowDeleteConfirm(true)}
              className="size-8"
              aria-label={t("tasksPage.bulk.deleteSelected")}
              title={t("tasksPage.bulk.deleteSelected")}
            >
              <Trash2 />

              <span className="sr-only">
                {t("tasksPage.bulk.deleteSelected")}
              </span>
            </Button>
          </TooltipTrigger>

          <TooltipContent>
            <p>{t("tasksPage.bulk.deleteSelected")}</p>
          </TooltipContent>
        </Tooltip>
      </BulkActionsToolbar>

      <TasksMultiDeleteDialog
        open={showDeleteConfirm}
        onOpenChange={setShowDeleteConfirm}
        table={table}
      />
    </>
  );
}
