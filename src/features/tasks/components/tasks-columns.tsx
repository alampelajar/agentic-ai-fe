import { type ColumnDef } from "@tanstack/react-table";
import i18n from "@/i18n";

import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { DataTableColumnHeader } from "@/components/data-table";

import { labels, priorities, statuses } from "../data/data";
import { type Task } from "../data/schema";
import { DataTableRowActions } from "./data-table-row-actions";

export const tasksColumns: ColumnDef<Task>[] = [
  {
    id: "select",

    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Select all"
        className="translate-y-0.5"
      />
    ),

    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Select row"
        className="translate-y-0.5"
      />
    ),

    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "id",

    header: ({ column }) => (
      <DataTableColumnHeader column={column} title={i18n.t("tasksPage.task")} />
    ),

    cell: ({ row }) => <div className="w-20">{row.getValue("id")}</div>,

    enableSorting: false,
    enableHiding: false,
  },

  {
    accessorKey: "title",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.t("tasksPage.titleColumn")}
      />
    ),

    meta: {
      className: "ps-1 max-w-0 w-2/3",
      tdClassName: "ps-4",
    },

    cell: ({ row }) => {
      const label = labels.find((label) => label.value === row.original.label);

      return (
        <div className="flex space-x-2">
          {label && <Badge variant="outline">{label.label}</Badge>}

          <button
            type="button"
            className="truncate font-medium text-left hover:underline hover:underline-offset-4"
            onClick={() => {
              window.location.assign(`/ai?task=${encodeURIComponent(String(row.original.id))}`)
            }}
            title={i18n.t("tasksPage.openChat")}
          >
            {row.getValue("title")}
          </button>
        </div>
      );
    },
  },

  {
    accessorKey: "status",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.t("tasksPage.status")}
      />
    ),

    meta: {
      className: "ps-1",
      tdClassName: "ps-4",
    },

    cell: ({ row }) => {
      const status = statuses.find(
        (status) => status.value === row.getValue("status"),
      );

      if (!status) {
        return null;
      }

      return (
        <div className="flex w-25 items-center gap-2">
          {status.icon && (
            <status.icon className="size-4 text-muted-foreground" />
          )}

          <span>{i18n.t(`tasksPage.statuses.${status.value}`)}</span>
        </div>
      );
    },

    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  {
    accessorKey: "priority",

    header: ({ column }) => (
      <DataTableColumnHeader
        column={column}
        title={i18n.t("tasksPage.priority")}
      />
    ),

    meta: {
      className: "ps-1",
      tdClassName: "ps-3",
    },

    cell: ({ row }) => {
      const priority = priorities.find(
        (priority) => priority.value === row.getValue("priority"),
      );

      if (!priority) {
        return null;
      }

      return (
        <div className="flex items-center gap-2">
          {priority.icon && (
            <priority.icon className="size-4 text-muted-foreground" />
          )}

          <span>{i18n.t(`tasksPage.priorities.${priority.value}`)}</span>
        </div>
      );
    },

    filterFn: (row, id, value) => {
      return value.includes(row.getValue(id));
    },
  },

  {
    id: "actions",

    cell: ({ row }) => <DataTableRowActions row={row} />,
  },
];
