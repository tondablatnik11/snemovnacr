// Testy pro react-hook-form petition sign form.
// Testujeme zobrazení, validaci a toasty.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PetitionSignFormRHF } from "./petition-sign-form-rhf";

// Mock tRPC client
vi.mock("~/trpc/client", () => ({
  api: {
    petice: {
      sign: {
        useMutation: () => ({
          mutate: vi.fn(),
          isPending: false,
          isError: false,
          isSuccess: false,
        }),
      },
    },
  },
}));

describe("PetitionSignFormRHF", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all form fields", () => {
    const { container } = render(<PetitionSignFormRHF peticeId="test-petition-id" />);
    expect(screen.getByLabelText(/Jméno a příjmení/)).toBeInTheDocument();
    // E-mail input má type="email" — použijeme querySelector
    expect(container.querySelector('input[type="email"]')).toBeInTheDocument();
    expect(container.querySelector("textarea")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Podepsat petici/ })).toBeInTheDocument();
  });

  it("submit button is disabled until form is valid", () => {
    const { container } = render(<PetitionSignFormRHF peticeId="test-petition-id" />);
    // Formátování — button je disabled, dokud není validní
    const button = container.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button).toBeDisabled();
  });

  it("shows validation error for empty jmeno on blur", async () => {
    const user = userEvent.setup();
    const { container } = render(<PetitionSignFormRHF peticeId="test-petition-id" />);

    const jmenoInput = container.querySelector('input[name="jmeno"]') as HTMLInputElement;
    expect(jmenoInput).toBeTruthy();
    await user.click(jmenoInput);
    await user.tab();

    expect(screen.getByText(/Jméno musí mít alespoň 2 znaky/)).toBeInTheDocument();
  });

  it("shows validation error for invalid email", async () => {
    const user = userEvent.setup();
    const { container } = render(<PetitionSignFormRHF peticeId="test-petition-id" />);

    const emailInput = container.querySelector('input[type="email"]') as HTMLInputElement;
    await user.type(emailInput, "not-an-email");
    await user.tab();

    // Najdeme element s třídou text-destructive (chybová zpráva)
    await waitFor(() => {
      const errors = container.querySelectorAll(".text-destructive");
      const errorTexts = Array.from(errors).map((e) => e.textContent);
      expect(errorTexts.some((t) => t?.includes("Neplatná e-mailová adresa"))).toBe(true);
    });
  });

  it("character counter shows comment length after typing", async () => {
    const user = userEvent.setup();
    const { container } = render(<PetitionSignFormRHF peticeId="test-petition-id" />);

    const commentInput = container.querySelector("textarea") as HTMLTextAreaElement;
    await user.type(commentInput, "A".repeat(50));

    expect(screen.getByText("50/500")).toBeInTheDocument();
  });
});