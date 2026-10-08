import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { BrandMark } from "./brand-mark";

afterEach(cleanup);

describe("Monii brand", () => {
  it("uses separate theme artwork without changing layout dimensions", () => {
    const { container } = render(<BrandMark />);
    expect(screen.getByText("Monii App")).toBeTruthy();
    const images = container.querySelectorAll("img");
    expect(images).toHaveLength(2);
    expect(images[0].getAttribute("src")).toBe("/icons/icon-192.png?v=3");
    expect(images[1].getAttribute("src")).toBe("/icons/icon-dark-192.png?v=3");
    expect(images[0].className).toContain("dark:hidden");
    expect(images[1].className).toContain("dark:block");
    for (const image of images) {
      expect(image.getAttribute("width")).toBe("40");
      expect(image.getAttribute("alt")).toBe("");
    }
  });

  it("keeps the icon when the sidebar is collapsed", () => {
    const { container } = render(<BrandMark compact />);
    expect(screen.queryByText("Monii App")).toBeNull();
    expect(container.querySelectorAll("img")).toHaveLength(2);
  });
});
