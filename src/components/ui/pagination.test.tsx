// Testy pro Pagination komponentu.

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination } from "./pagination";

/** Render v izolaci — bez layout komponent, které by mohly obsahovat jiné odkazy. */
function renderIsolated(ui: React.ReactElement) {
  return render(<div data-testid="pagination-host">{ui}</div>);
}

describe("Pagination", () => {
  it("renders navigation landmark", () => {
    renderIsolated(<Pagination currentPage={1} basePath="/test" hasNext={false} />);
    expect(
      screen.getByRole("navigation", { name: /Stránkování/ })
    ).toBeInTheDocument();
  });

  it("does not render any links when no prev and no next", () => {
    const { container } = renderIsolated(
      <Pagination
        currentPage={1}
        basePath="/test"
        hasNext={false}
        showNumbers={false}
      />
    );
    expect(container.querySelectorAll("a").length).toBe(0);
  });

  it("renders next link when hasNext=true", () => {
    const { container } = renderIsolated(
      <Pagination currentPage={1} basePath="/test" hasNext={true} />
    );
    const links = Array.from(container.querySelectorAll("a"));
    const nextLink = links.find((a) => a.textContent?.includes("Další"));
    expect(nextLink).toBeDefined();
    expect(nextLink).toHaveAttribute("href", "/test?page=2");
  });

  it("renders prev link when currentPage > 1", () => {
    const { container } = renderIsolated(
      <Pagination currentPage={3} basePath="/test" hasNext={true} />
    );
    const links = Array.from(container.querySelectorAll("a"));
    const prevLink = links.find((a) => a.textContent?.includes("Předchozí"));
    expect(prevLink).toBeDefined();
    expect(prevLink).toHaveAttribute("href", "/test?page=2");
  });

  it("preserves searchParams in URL", () => {
    const { container } = renderIsolated(
      <Pagination
        currentPage={2}
        basePath="/poslanci"
        searchParams={{ search: "novak", klub: "5" }}
        hasNext={true}
      />
    );
    const nextLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Další")
    );
    expect(nextLink).toBeDefined();
    const href = nextLink?.getAttribute("href") ?? "";
    expect(href).toContain("search=novak");
    expect(href).toContain("klub=5");
    expect(href).toContain("page=3");
  });

  it("does not include page=1 in URL", () => {
    const { container } = renderIsolated(
      <Pagination
        currentPage={1}
        basePath="/test"
        searchParams={{ search: "foo" }}
        hasNext={true}
      />
    );
    const nextLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Další")
    );
    const href = nextLink?.getAttribute("href") ?? "";
    expect(href).not.toContain("page=1");
  });

  it("marks current page with aria-current", () => {
    const { container } = renderIsolated(
      <Pagination
        currentPage={3}
        basePath="/test"
        hasNext={true}
        showNumbers={true}
      />
    );
    const currentLink = container.querySelector('[aria-current="page"]');
    expect(currentLink).toBeInTheDocument();
    expect(currentLink?.getAttribute("href")).toBe("/test?page=3");
  });

  it("renders page numbers around current page", () => {
    const { container } = renderIsolated(
      <Pagination
        currentPage={5}
        basePath="/test"
        hasNext={true}
        showNumbers={true}
      />
    );
    for (const p of [3, 4, 5, 6, 7]) {
      const link = container.querySelector(`a[href$="page=${p}"]`);
      expect(link, `link for page ${p} should exist`).toBeInTheDocument();
    }
  });

  it("uses custom labels", () => {
    const { container } = renderIsolated(
      <Pagination
        currentPage={2}
        basePath="/test"
        hasNext={true}
        labels={{ prev: "Před", next: "Dal" }}
      />
    );
    const prevLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Před")
    );
    const nextLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Dal")
    );
    expect(prevLink).toBeDefined();
    expect(nextLink).toBeDefined();
  });

  it("hides page numbers when showNumbers=false", () => {
    const { container } = renderIsolated(
      <Pagination
        currentPage={2}
        basePath="/test"
        hasNext={true}
        showNumbers={false}
      />
    );
    const currentEl = container.querySelector('[aria-current="page"]');
    expect(currentEl).toBeNull();
    const nextLink = Array.from(container.querySelectorAll("a")).find((a) =>
      a.textContent?.includes("Další")
    );
    expect(nextLink).toBeDefined();
  });
});