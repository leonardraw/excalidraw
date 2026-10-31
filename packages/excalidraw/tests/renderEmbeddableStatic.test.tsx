// On SVG export, the host can supply a static rendering of an embeddable
// (e.g. a widget) instead of the grey placeholder.
import { getDefaultAppState } from "../appState";
import { Excalidraw } from "../index";
import { exportScene } from "../scene/export";

import { API } from "./helpers/api";
import { render } from "./test-utils";

const widget = () => ({
  ...API.createElement({
    type: "embeddable",
    x: 10,
    y: 20,
    width: 120,
    height: 80,
  }),
  customData: { widget: "poll" },
});

describe("exportScene svg with renderEmbeddableStatic", () => {
  beforeEach(async () => {
    await render(<Excalidraw />);
  });

  it("renders the default placeholder when the host gives nothing", async () => {
    const svg = await exportScene({
      type: "svg",
      data: { elements: [widget()], appState: getDefaultAppState(), files: {} },
      config: {},
    });
    expect(svg.querySelector("[data-testid=widget-static]")).toBe(null);
  });

  it("inserts the host node, positioned on the element", async () => {
    const element = widget();
    const svg = await exportScene({
      type: "svg",
      data: { elements: [element], appState: getDefaultAppState(), files: {} },
      config: {
        renderEmbeddableStatic: (el, document) => {
          expect(el.id).toBe(element.id);
          const text = document.createElementNS(
            "http://www.w3.org/2000/svg",
            "text",
          );
          text.setAttribute("data-testid", "widget-static");
          text.textContent = `${el.customData?.widget} statique`;
          return text;
        },
      },
    });
    const node = svg.querySelector("[data-testid=widget-static]");
    expect(node).not.toBe(null);
    expect(node!.textContent).toBe("poll statique");
    expect(node!.getAttribute("transform")).toMatch(/translate\(/);
  });

  it("falls back to the placeholder when the host returns null", async () => {
    const svg = await exportScene({
      type: "svg",
      data: { elements: [widget()], appState: getDefaultAppState(), files: {} },
      config: { renderEmbeddableStatic: () => null },
    });
    expect(svg.querySelector("[data-testid=widget-static]")).toBe(null);
  });
});
