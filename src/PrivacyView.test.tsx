import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import PrivacyView from "./PrivacyView";

describe("PrivacyView", () => {
  test("explains storage safety without overclaiming", () => {
    render(<PrivacyView onBack={vi.fn()} />);

    expect(
      screen.getByText(/Files are encrypted before upload/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Nothing sends without your approval/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/LifeMap is not zero-knowledge/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Clear my map removes stored files before records are cleared/i),
    ).toBeInTheDocument();

    expect(screen.queryByText(/HIPAA compliant/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/bank-grade/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/only you can decrypt/i)).not.toBeInTheDocument();
  });
});
