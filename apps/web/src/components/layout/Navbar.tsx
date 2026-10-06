"use client";

import Link from "next/link";
import { useState } from "react";
import { Dumbbell, ShoppingBag, Menu, X, User, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">Playmate</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          <Link
            href="/venues"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Dumbbell className="h-4 w-4 text-play" />
            Play
          </Link>
          <Link
            href="/shop"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShoppingBag className="h-4 w-4 text-shop" />
            Shop
          </Link>
          <Link
            href="/about"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button variant="ghost" size="sm" className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
          <Button size="sm" className="gap-2">
            <User className="h-4 w-4" />
            Sign up
          </Button>
        </div>

        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="border-t md:hidden">
          <nav className="container mx-auto flex flex-col gap-4 p-4">
            <Link
              href="/venues"
              className="flex items-center gap-2 rounded-lg p-2 font-medium hover:bg-muted"
              onClick={() => setIsMenuOpen(false)}
            >
              <Dumbbell className="h-5 w-5 text-play" />
              Find Courts
            </Link>
            <Link
              href="/shop"
              className="flex items-center gap-2 rounded-lg p-2 font-medium hover:bg-muted"
              onClick={() => setIsMenuOpen(false)}
            >
              <ShoppingBag className="h-5 w-5 text-shop" />
              Sports Shop
            </Link>
            <Link
              href="/about"
              className="rounded-lg p-2 font-medium hover:bg-muted"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            <div className="flex flex-col gap-2 border-t pt-4">
              <Button variant="outline" size="sm" className="w-full gap-2 justify-center">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
              <Button size="sm" className="w-full gap-2 justify-center">
                <User className="h-4 w-4" />
                Sign up
              </Button>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
