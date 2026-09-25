import { useTranslation } from "react-i18next";

import { ConfirmDialog } from "@/components/confirm-dialog";
import { TasksImportDialog } from "./tasks-import-dialog";
import { TasksMutateDrawer } from "./tasks-mutate-drawer";
import { useTasks } from "./tasks-provider";

export function TasksDialogs() {
  const { t } = useTranslation();

  const { open, setOpen, currentRow, setCurrentRow, remove } = useTasks();

  return (
    <>
      <TasksMutateDrawer
        key="task-create"
        open={open === "create"}
        onOpenChange={() => setOpen("create")}
      />

      <TasksImportDialog
        key="tasks-import"
        open={open === "import"}
        onOpenChange={() => setOpen("import")}
      />

      {currentRow && (
        <>
          <TasksMutateDrawer
            key={`task-update-${currentRow.id}`}
            open={open === "update"}
            onOpenChange={() => {
              setOpen("update");

              setTimeout(() => {
                setCurrentRow(null);
              }, 500);
            }}
            currentRow={currentRow}
          />

          <ConfirmDialog
            key="task-delete"
            destructive
            open={open === "delete"}
            onOpenChange={() => {
              setOpen("delete");

              setTimeout(() => {
                setCurrentRow(null);
              }, 500);
            }}
            handleConfirm={async () => {
              try {
                await remove(currentRow.id);
                setOpen(null);
                setCurrentRow(null);
              } catch (err) {
                console.error(err);
              }
            }}
            className="max-w-md"
            title={t("tasksPage.deleteTitle", {
              id: currentRow.id,
            })}
            desc={
              <>
                {t("tasksPage.deleteDescription")}{" "}
                <strong>{currentRow.id}</strong>.
                <br />
                {t("tasksPage.deleteWarning")}
              </>
            }
            confirmText={t("tasksPage.delete")}
          />
        </>
      )}
    </>
  );
}
