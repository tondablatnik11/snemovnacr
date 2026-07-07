// Testy pro EmptyState a Skeleton UI komponenty.

import { describe, it, expect } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { FileX } from "lucide-react";
import { EmptyState } from "./empty-state";
import { Skeleton, SkeletonCard, SkeletonList } from "./skeleton";

// Vyčistí DOM po každém testu (auto-cleanup by default, ale explicitní pro jistotu)
afterEach(() => cleanup());

describe("EmptyState", () => {
  it("renders with title and description", () => {
    render(<EmptyState title="Žádné výsledky" description="Zkuste to prosím znovu." />);
    expect(screen.getByRole("heading", { name: /Žádné výsledky/ })).toBeInTheDocument();
    expect(screen.getByText(/Zkuste to prosím znovu/)).toBeInTheDocument();
  });

  it("renders default icon when not specified", () => {
    const { container } = render(<EmptyState title="Test" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders custom icon", () => {
    const { container } = render(<EmptyState icon={FileX} title="Test" />);
    expect(container.querySelector("svg")).toBeInTheDocument();
  });

  it("renders action as link when href provided", () => {
    render(<EmptyState title="Test" action={{ label: "Zpět domů", href: "/test-target" }} />);
    // Hledáme specifický link (ne libovolný z layoutu)
    const link = screen.getByRole("link", { name: /Zpět domů/ });
    expect(link).toHaveAttribute("href", "/test-target");
  });

  it("renders action as button when onClick provided", () => {
    render(<EmptyState title="Test" action={{ label: "Klikni-sem", onClick: () => {} }} />);
    expect(screen.getByRole("button", { name: /Klikni-sem/ })).toBeInTheDocument();
  });

  it("does not render action if not provided", () => {
    render(<EmptyState title="Specificky-unikatni-title" />);
    // Žádný link s textem "Specificky-unikatni-title-button" by neměl existovat
    expect(screen.queryByText(/Specificky-unikatni-title-button/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Specificky-unikatni-title/ })).toBeNull();
  });
});

describe("Skeleton", () => {
  it("has role=status for accessibility", () => {
    render(<Skeleton />);
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="h-10 w-20" />);
    const el = container.querySelector('[role="status"]');
    expect(el?.className).toContain("h-10");
    expect(el?.className).toContain("w-20");
  });
});

describe("SkeletonCard", () => {
  it("renders multiple skeleton lines", () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll('[role="status"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });
});

describe("SkeletonList", () => {
  it("renders requested number of items", () => {
    const { container } = render(<SkeletonList count={3} />);
    const items = container.querySelectorAll('[role="status"]');
    // Každý item má 3 skeleton části (avatar + title + subtitle)
    expect(items.length).toBe(9);
  });
});