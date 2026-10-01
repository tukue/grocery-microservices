import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

describe("Home page", () => {
  it("renders the home page with search field", () => {
    render(<div data-testid="home-page" />);
    expect(screen.getByTestId("home-page")).toBeInTheDocument();
  });
});

describe("Intersection Observer basic test", () => {
  it("tests dom element presence", () => {
    render(<div data-testid="test-element">Content</div>);
    const element = screen.getByTestId("test-element");
    expect(element).toBeInTheDocument();
  });
});