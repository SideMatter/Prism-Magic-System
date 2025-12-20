"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Zap, User, Shield, Wrench } from "lucide-react";
import {
  NavigationMenu,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
  NavigationMenuContent,
  navigationMenuTriggerStyle,
} from "@/components/ui/navigation-menu";
import { cn } from "@/lib/utils";

const ListItem = React.forwardRef<
  React.ElementRef<"a">,
  React.ComponentPropsWithoutRef<"a"> & { icon?: React.ReactNode; active?: boolean }
>(({ className, title, children, icon, active, ...props }, ref) => {
  return (
    <li>
      <NavigationMenuLink asChild>
        <a
          ref={ref}
          className={cn(
            "flex items-center gap-3 select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
            active && "bg-accent text-accent-foreground",
            className
          )}
          {...props}
        >
          {icon && <div className="flex items-center">{icon}</div>}
          <div className="flex flex-col gap-1">
            <div className="text-sm font-medium leading-none">{title}</div>
            {children && (
              <p className="line-clamp-2 text-sm leading-snug text-muted-foreground">
                {children}
              </p>
            )}
          </div>
        </a>
      </NavigationMenuLink>
    </li>
  );
});
ListItem.displayName = "ListItem";

export function Navbar() {
  const pathname = usePathname();

  const isPlayerToolsActive = pathname.startsWith("/spell-combiner");
  const isDMActive = pathname === "/npc" || pathname === "/admin";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex h-16 items-center">
        <Link href="/" className="text-xl font-bold mr-auto">
          Prism Magic System
        </Link>
        
        <NavigationMenu className="flex-none">
          <NavigationMenuList>
            {/* Spells */}
            <NavigationMenuItem>
              <Link href="/" legacyBehavior passHref>
                <NavigationMenuLink
                  className={cn(
                    navigationMenuTriggerStyle(),
                    "gap-2",
                    pathname === "/" && "bg-accent text-accent-foreground"
                  )}
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Spells</span>
                </NavigationMenuLink>
              </Link>
            </NavigationMenuItem>

            {/* Player Tools */}
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  "gap-2",
                  isPlayerToolsActive && "bg-accent text-accent-foreground"
                )}
              >
                <Wrench className="w-4 h-4" />
                <span className="hidden sm:inline">Player Tools</span>
              </NavigationMenuTrigger>
              <NavigationMenuContent className="right-0 left-auto">
                <ul className="grid w-[250px] gap-1 p-2">
                  <ListItem
                    href="/spell-combiner"
                    title="Spell Combiner"
                    icon={<Zap className="w-4 h-4" />}
                    active={pathname === "/spell-combiner"}
                  >
                    Combine spells to create powerful magic
                  </ListItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>

            {/* DM Tools */}
            <NavigationMenuItem>
              <NavigationMenuTrigger
                className={cn(
                  "gap-2",
                  isDMActive && "bg-accent text-accent-foreground"
                )}
              >
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">DM</span>
              </NavigationMenuTrigger>
              <NavigationMenuContent className="right-0 left-auto">
                <ul className="grid w-[250px] gap-1 p-2">
                  <ListItem
                    href="/admin"
                    title="Admin Panel"
                    icon={<Shield className="w-4 h-4" />}
                    active={pathname === "/admin"}
                  >
                    Manage spells and players
                  </ListItem>
                  <ListItem
                    href="/npc"
                    title="NPC Generator"
                    icon={<User className="w-4 h-4" />}
                    active={pathname === "/npc"}
                  >
                    Generate NPCs with prism classes
                  </ListItem>
                </ul>
              </NavigationMenuContent>
            </NavigationMenuItem>
          </NavigationMenuList>
        </NavigationMenu>
      </div>
    </header>
  );
}
