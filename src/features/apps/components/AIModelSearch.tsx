// ============================================================
// AI MODEL SEARCH
// ============================================================

import type { ChangeEvent } from "react";
import { Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface AIModelSearchProps {
  value: string;
  onChange: (value: string) => void;
}

export function AIModelSearch({ value, onChange }: AIModelSearchProps) {
  const { t } = useTranslation();

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };

  const handleClear = () => {
    onChange("");
  };

  return (
    <div className="relative w-full sm:w-72">
      {/* Search icon */}
      <Search
        size={15}
        className="
          pointer-events-none
          absolute
          left-3
          top-1/2
          -translate-y-1/2
          text-muted-foreground
        "
      />

      {/* Input */}
      <Input
        value={value}
        onChange={handleChange}
        placeholder={t("aiModelHub.searchPlaceholder")}
        className="
          h-9
          w-full
          pl-9
          pr-8
          text-sm
        "
      />

      {/* Clear button */}
      {value && (
        <Button
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="
            absolute
            right-1
            top-1/2
            size-6
            -translate-y-1/2
            rounded-md
            text-muted-foreground
            hover:text-foreground
          "
          aria-label="Clear search"
        >
          <X size={13} />
        </Button>
      )}
    </div>
  );
}
