import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { api } from "../src/api";
import Bugs from "../src/pages/Bugs";

vi.mock("../src/api", () => ({
  api: vi.fn(),
}));

const bug = {
  _id: "b1",
  bugId: 2,
  title: "Search returns nothing",
  description: "Empty results",
  product: { _id: "p1", name: "Myzilla" },
  status: "Open",
  developer: { _id: "u2", name: "Pat" },
  qa: null,
  createdBy: { _id: "u1", name: "Admin" },
  updatedBy: { _id: "u1", name: "Admin" },
};

beforeEach(() => {
  api.mockImplementation(async (path, options = {}) => {
    if (path === "/api/products") return [{ _id: "p1", name: "Myzilla" }];
    if (path === "/api/users") return [{ _id: "u1", name: "Admin" }, { _id: "u2", name: "Pat" }];
    if (path.startsWith("/api/bugs") && (!options.method || options.method === "GET")) return [bug];
    return {};
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

test("opens a read-only view from the bugs list", async () => {
  render(<Bugs />);

  expect(await screen.findByText("Search returns nothing")).toBeTruthy();
  expect(screen.getByRole("button", { name: "View" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Edit" })).toBeTruthy();
  expect(screen.getByRole("button", { name: "Delete" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "View" }));

  expect(screen.getByRole("heading", { name: "Bug 2" })).toBeTruthy();
  expect(screen.getAllByText("Empty results").length).toBeGreaterThan(0);
  expect(screen.getAllByText("Pat").length).toBeGreaterThan(0);
  expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  expect(screen.queryByRole("textbox")).toBeNull();

  fireEvent.click(screen.getByRole("button", { name: "Close" }));
  expect(screen.queryByRole("heading", { name: "Bug 2" })).toBeNull();
});

test("edit still opens the bug form", async () => {
  render(<Bugs />);
  await screen.findByText("Search returns nothing");

  fireEvent.click(screen.getByRole("button", { name: "Edit" }));

  expect(screen.getByRole("heading", { name: "Edit bug" })).toBeTruthy();
  expect(screen.getByDisplayValue("Search returns nothing")).toBeTruthy();
  expect(screen.getByRole("button", { name: "Save" })).toBeTruthy();
});
