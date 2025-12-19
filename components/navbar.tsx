"use client";

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

export function Navbar() {
  const pathname = usePathname();

  const isPlayerToolsActive = pathname.startsWith("/spell-combiner");
  const isDMActive = pathname === "/npc" || pathname === "/admin";

  return (
    <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="text-xl font-bold">
              Prism Magic System
            </Link>
          </div>
          <div className="flex items-center">
            <NavigationMenu>
              <NavigationMenuList>
                {/* Spells - No dropdown */}
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

                {/* Player Tools Dropdown */}
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
                  <NavigationMenuContent>
                    <ul className="p-2">
                      <li>
                        <Link href="/spell-combiner" legacyBehavior passHref>
                          <NavigationMenuLink
                            className={cn(
                              "flex items-center gap-2 select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                              pathname === "/spell-combiner" && "bg-accent text-accent-foreground"
                            )}
                          >
                            <Zap className="w-4 h-4" />
                            <span className="text-sm font-medium">Combiner</span>
                          </NavigationMenuLink>
                        </Link>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>

                {/* DM Dropdown */}
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
                  <NavigationMenuContent>
                    <ul className="p-2">
                      <li>
                        <Link href="/admin" legacyBehavior passHref>
                          <NavigationMenuLink
                            className={cn(
                              "flex items-center gap-2 select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                              pathname === "/admin" && "bg-accent text-accent-foreground"
                            )}
                          >
                            <Shield className="w-4 h-4" />
                            <span className="text-sm font-medium">Admin</span>
                          </NavigationMenuLink>
                        </Link>
                      </li>
                      <li>
                        <Link href="/npc" legacyBehavior passHref>
                          <NavigationMenuLink
                            className={cn(
                              "flex items-center gap-2 select-none rounded-md p-3 leading-none no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground",
                              pathname === "/npc" && "bg-accent text-accent-foreground"
                            )}
                          >
                            <User className="w-4 h-4" />
                            <span className="text-sm font-medium">NPC Generator</span>
                          </NavigationMenuLink>
                        </Link>
                      </li>
                    </ul>
                  </NavigationMenuContent>
                </NavigationMenuItem>
              </NavigationMenuList>
            </NavigationMenu>
          </div>
        </div>
      </div>
    </nav>
  );
}
