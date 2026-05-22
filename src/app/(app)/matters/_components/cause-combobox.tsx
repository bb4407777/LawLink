"use client";

import { useState, useEffect, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2 } from "lucide-react";
import type { MatterCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { searchCauses } from "@/server/causes/actions";
import { cn } from "@/lib/utils";

type CauseOption = {
  id: string;
  code: string | null;
  name: string;
  shortName: string | null;
  level: number;
};

type Props = {
  value: string;
  onChange: (id: string, name: string) => void;
  category: MatterCategory;
  disabled?: boolean;
};

export function CauseCombobox({ value, onChange, category, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CauseOption[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedName, setSelectedName] = useState<string>("");

  // 切换 category 时清空选择
  useEffect(() => {
    if (value && options.length > 0) {
      const found = options.find((o) => o.id === value);
      if (found) setSelectedName(found.name);
    }
  }, [value, options]);

  // 打开 popover 时拉取该 category 的案由
  function handleOpen(o: boolean) {
    setOpen(o);
    if (o && options.length === 0) {
      startTransition(async () => {
        const data = await searchCauses({ category, limit: 100 });
        setOptions(data);
      });
    }
  }

  // category 变化时重置 options
  useEffect(() => {
    setOptions([]);
    if (value) {
      // 清空已选（因为类别变了，旧案由不适用了）
      onChange("", "");
      setSelectedName("");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value && selectedName ? (
            <span className="truncate">{selectedName}</span>
          ) : (
            <span className="text-muted-foreground">搜索或选择案由</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <Command>
          <CommandInput placeholder="输入关键词，如借贷、合同..." />
          <CommandList>
            {isPending ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="ml-2">加载案由库...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>未找到匹配案由</CommandEmpty>
                <CommandGroup>
                  {options.map((opt) => (
                    <CommandItem
                      key={opt.id}
                      value={`${opt.name} ${opt.shortName ?? ""}`}
                      onSelect={() => {
                        onChange(opt.id, opt.name);
                        setSelectedName(opt.name);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4",
                          value === opt.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate text-sm">{opt.name}</div>
                        {opt.code && (
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {opt.code}
                          </div>
                        )}
                      </div>
                      {opt.shortName && (
                        <span className="ml-2 text-xs text-muted-foreground">
                          {opt.shortName}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
