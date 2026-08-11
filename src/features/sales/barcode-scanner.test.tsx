import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BarcodeScanner } from "@/features/sales/barcode-scanner";

describe("BarcodeScanner", () => {
  it("opens the compact camera dialog from its scan button", () => {
    const onScan = vi.fn();
    render(<BarcodeScanner feedback={null} onScan={onScan} />);

    fireEvent.click(screen.getByRole("button", { name: "Escanear código" }));

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Apunta al código de barras" })).toBeTruthy();
  });
});
