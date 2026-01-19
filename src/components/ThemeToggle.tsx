import { useState, useEffect } from 'react';
import { Sun, Moon, Monitor, Check, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { Theme, ResolvedTheme } from '@/hooks/useTheme';

interface ThemeToggleProps {
  theme: Theme;
  resolvedTheme: ResolvedTheme;
  setTheme: (theme: Theme) => void;
  className?: string;
}

const ThemeToggle = ({ theme, resolvedTheme, setTheme, className }: ThemeToggleProps) => {
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: Theme) => {
    setIsAnimating(true);
    setTheme(newTheme);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { 
      value: 'light', 
      label: 'Light', 
      icon: <Sun className="w-4 h-4" /> 
    },
    { 
      value: 'dark', 
      label: 'Dark', 
      icon: <Moon className="w-4 h-4" /> 
    },
    { 
      value: 'system', 
      label: 'System', 
      icon: <Monitor className="w-4 h-4" /> 
    },
  ];

  const currentIcon = resolvedTheme === 'dark' ? (
    <Moon className={cn(
      "w-5 h-5 transition-all duration-500",
      isAnimating && "animate-spin"
    )} />
  ) : (
    <Sun className={cn(
      "w-5 h-5 transition-all duration-500",
      isAnimating && "animate-spin"
    )} />
  );

  if (!mounted) {
    return (
      <Button 
        variant="ghost" 
        size="icon" 
        className={cn("w-10 h-10 rounded-full", className)}
        disabled
      >
        <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "relative group h-10 px-3 gap-2 rounded-full",
            "glass-card border border-border/50",
            "hover:border-primary/50 hover:bg-primary/10",
            "transition-all duration-300 ease-out",
            "focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            className
          )}
        >
          {/* Icon container with glow effect */}
          <div className={cn(
            "relative flex items-center justify-center",
            "transition-transform duration-300",
            "group-hover:scale-110"
          )}>
            {/* Glow background */}
            <div className={cn(
              "absolute inset-0 rounded-full blur-md opacity-0",
              "group-hover:opacity-60 transition-opacity duration-300",
              resolvedTheme === 'dark' 
                ? "bg-primary/40" 
                : "bg-warning/40"
            )} />
            
            {/* Icon with rotation animation */}
            <div className={cn(
              "relative z-10",
              resolvedTheme === 'dark' ? "text-primary" : "text-warning"
            )}>
              {currentIcon}
            </div>
          </div>

          {/* Label - hidden on mobile */}
          <span className="hidden sm:inline-flex text-sm font-medium capitalize">
            {theme === 'system' ? 'Auto' : theme}
          </span>

          {/* Chevron - hidden on mobile */}
          <ChevronDown className="hidden sm:block w-3 h-3 opacity-60 group-hover:opacity-100 transition-opacity" />

          {/* System indicator dot */}
          {theme === 'system' && (
            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-accent animate-pulse" />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent 
        align="end" 
        className={cn(
          "min-w-[160px] p-2",
          "glass-card border border-border/50",
          "backdrop-blur-xl",
          "animate-in fade-in-0 zoom-in-95 duration-200"
        )}
      >
        {themeOptions.map((option) => (
          <DropdownMenuItem
            key={option.value}
            onClick={() => handleThemeChange(option.value)}
            className={cn(
              "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg cursor-pointer",
              "transition-all duration-200",
              theme === option.value 
                ? "bg-primary/15 text-primary" 
                : "hover:bg-muted"
            )}
          >
            <div className="flex items-center gap-3">
              <div className={cn(
                "p-1.5 rounded-md transition-colors duration-200",
                theme === option.value 
                  ? "bg-primary/20" 
                  : "bg-muted"
              )}>
                {option.icon}
              </div>
              <span className="font-medium">{option.label}</span>
            </div>
            
            {theme === option.value && (
              <Check className="w-4 h-4 text-primary animate-in zoom-in-50 duration-200" />
            )}
          </DropdownMenuItem>
        ))}

        {/* Current status indicator */}
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
            <div className={cn(
              "w-2 h-2 rounded-full",
              resolvedTheme === 'dark' ? "bg-primary" : "bg-warning"
            )} />
            <span>Currently: {resolvedTheme === 'dark' ? 'Dark' : 'Light'} mode</span>
          </div>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
