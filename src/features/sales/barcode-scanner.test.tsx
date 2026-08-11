import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { BarcodeScanner } from "@/features/sales/barcode-scanner";

describe("BarcodeScanner", () => {
  it("submits codes from a keyboard-wedge reader with Enter", () => {
    const onScan = vi.fn();
    render(<BarcodeScanner feedback={null} onScan={onScan} />);

    const input = screen.getByPlaceholderText("Escanea o escribe el SKU y presiona Enter");
    fireEvent.change(input, { target: { value: "001234567890" } });
    fireEvent.keyDown(input, { key: "Enter" });

    expect(onScan).toHaveBeenCalledWith("001234567890");
    expect((input as HTMLInputElement).value).toBe("");
  });
});
