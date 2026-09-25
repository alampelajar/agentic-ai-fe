import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean;
  ref?: React.Ref<HTMLElement>;
};

export function Header({
  className,
  fixed = false,
  children,
  ...props
}: HeaderProps) {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setOffset(document.body.scrollTop || document.documentElement.scrollTop);
    };

    document.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      document.removeEventListener("scroll", handleScroll);
    };
  }, []);

  return (
    <header
      className={cn(
        "z-50 h-14 border-b border-border/70 bg-background",
        fixed && "sticky top-0 w-full",
        fixed && offset > 10 ? "shadow-none" : "shadow-none",
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          "relative flex h-full items-center gap-3 px-4 sm:gap-4",
          
        )}
      >
        {/* Sidebar */}
        <SidebarTrigger variant="outline" className="max-md:scale-125" />

        <Separator orientation="vertical" className="h-6" />

        {/* Isi navbar */}
        {children}
      </div>
    </header>
  );
}
