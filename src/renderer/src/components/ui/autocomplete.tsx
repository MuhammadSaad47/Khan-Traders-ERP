import * as React from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Input } from "@/components/ui/input"

export interface AutocompleteOption {
  value: string;
  label: string;
}

interface AutocompleteProps {
  options: AutocompleteOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  name?: string;
  required?: boolean;
}

export function Autocomplete({
  options,
  value,
  onChange,
  placeholder,
  className,
  required,
  name
}: AutocompleteProps) {
  const [open, setOpen] = React.useState(false)

  // Filter options based on current value
  const filteredOptions = React.useMemo(() => {
    if (!value) return options;
    const lowerValue = value.toLowerCase();
    return options.filter(o => o.label.toLowerCase().includes(lowerValue));
  }, [options, value]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div className="relative">
          <Input
            value={value}
            onChange={(e) => {
              onChange(e.target.value)
              setOpen(true)
            }}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            className={className}
            required={required}
            name={name}
          />
        </div>
      </PopoverTrigger>
      {open && filteredOptions.length > 0 && (
        <PopoverContent 
          className="p-0" 
          align="start" 
          onOpenAutoFocus={(e) => e.preventDefault()} // Prevent stealing focus from input
          style={{ width: 'var(--radix-popover-trigger-width)' }}
        >
          <Command>
            <CommandList>
              <CommandGroup>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={(currentValue) => {
                      onChange(currentValue)
                      setOpen(false)
                    }}
                  >
                    {option.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      )}
    </Popover>
  )
}
