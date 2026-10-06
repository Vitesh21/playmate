// Client component directive — required because this component uses React state (useState)
"use client";

// Next.js Link for client-side navigation without full page reloads
import Link from "next/link";
// React state hook to manage the mobile hamburger menu open/closed state
import { useState } from "react";
// Lucide icons: dumbbell=Play/venues, shopping-bag=Shop, menu=hamburger open, X=hamburger close, user=sign up, log-in=sign in
import { Dumbbell, ShoppingBag, Menu, X, User, LogIn } from "lucide-react";
// Shared shadcn-style Button component with variant/size support
import { Button } from "@/components/ui/Button";

/**
 * Site-wide sticky top navigation bar.
 * Renders as a full horizontal bar on md+ screens with logo, nav links, and auth buttons.
 * On mobile screens (< md) collapses into a hamburger toggle that expands a vertical dropdown menu.
 * Uses glass-morphism effect (backdrop-blur + translucent background) while sticky-scrolled.
 */
export function Navbar() {
  // Mobile menu state: boolean toggles whether the expanded dropdown nav is visible below the header
  // Only rendered/shown on viewports below the `md` breakpoint (< 768px)
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    // Sticky header: stays pinned to top of viewport during scroll, sits above all other content (z-50)
    // Uses translucent background + backdrop blur for glass effect while scrolling
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      {/* Inner container: 16:9 aspect ratio h-16 height, horizontally spaced 3-column layout */}
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* LEFT: Brand logo + wordmark — links back to the home page */}
        <Link href="/" className="flex items-center gap-2">
          {/* Primary-colored square icon badge with dumbbell glyph */}
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
            <Dumbbell className="h-5 w-5 text-primary-foreground" />
          </div>
          {/* Brand wordmark */}
          <span className="text-xl font-bold tracking-tight">Playmate</span>
        </Link>

        {/* CENTER: Desktop navigation links — hidden on mobile, visible md+ */}
        <nav className="hidden items-center gap-8 md:flex">
          {/* Play (Venues) link — green dumbbell icon, navigates to /venues */}
          <Link
            href="/venues"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <Dumbbell className="h-4 w-4 text-play" />
            Play
          </Link>
          {/* Shop (Products) link — blue shopping bag icon, navigates to /shop */}
          <Link
            href="/shop"
            className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ShoppingBag className="h-4 w-4 text-shop" />
            Shop
          </Link>
          {/* About page link — no icon, plain text link */}
          <Link
            href="/about"
            className="text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
        </nav>

        {/* RIGHT: Desktop auth CTA buttons — Sign in (ghost) + Sign up (primary default) */}
        <div className="hidden items-center gap-3 md:flex">
          {/* Sign in button — ghost (transparent bg) variant, small size */}
          <Button variant="ghost" size="sm" className="gap-2">
            <LogIn className="h-4 w-4" />
            Sign in
          </Button>
          {/* Sign up button — primary default (filled) variant, small size */}
          <Button size="sm" className="gap-2">
            <User className="h-4 w-4" />
            Sign up
          </Button>
        </div>

        {/* MOBILE HAMBURGER TOGGLE BUTTON — visible only on <md screens, hidden on md+ */}
        {/* Toggles isMenuOpen state on click; swaps between Menu (closed) and X (open) icons */}
        <button
          className="inline-flex items-center justify-center rounded-md p-2 text-foreground md:hidden"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label="Toggle menu"
        >
          {isMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* CONDITIONAL MOBILE DROPDOWN MENU — rendered only when isMenuOpen === true */}
      {/* Bordered panel below the header, hidden on md+ (desktop has inline nav instead) */}
      {isMenuOpen && (
        <div className="border-t md:hidden">
          {/* Vertical flex column of nav links + auth buttons with spacing */}
          <nav className="container mx-auto flex flex-col gap-4 p-4">
            {/* Mobile: Play/Venues link — larger tap target (p-2 rounded), closes menu on click */}
            <Link
              href="/venues"
              className="flex items-center gap-2 rounded-lg p-2 font-medium hover:bg-muted"
              onClick={() => setIsMenuOpen(false)}
            >
              <Dumbbell className="h-5 w-5 text-play" />
              Find Courts
            </Link>
            {/* Mobile: Shop link — closes menu on navigation */}
            <Link
              href="/shop"
              className="flex items-center gap-2 rounded-lg p-2 font-medium hover:bg-muted"
              onClick={() => setIsMenuOpen(false)}
            >
              <ShoppingBag className="h-5 w-5 text-shop" />
              Sports Shop
            </Link>
            {/* Mobile: About link — closes menu on navigation */}
            <Link
              href="/about"
              className="rounded-lg p-2 font-medium hover:bg-muted"
              onClick={() => setIsMenuOpen(false)}
            >
              About
            </Link>
            {/* Mobile: Auth buttons group — separated by top border from nav links, full-width stacked */}
            <div className="flex flex-col gap-2 border-t pt-4">
              {/* Mobile sign in — outline variant, full width, centered icon+text */}
              <Button variant="outline" size="sm" className="w-full gap-2 justify-center">
                <LogIn className="h-4 w-4" />
                Sign in
              </Button>
              {/* Mobile sign up — primary default variant, full width, centered */}
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
