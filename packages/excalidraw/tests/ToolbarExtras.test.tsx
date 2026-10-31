// <ToolbarExtras> children render inside the native toolbar, after the eraser
// and before the "more tools" divider.
import { Excalidraw, ToolbarExtras } from "../index";

import { render } from "./test-utils";

describe("<ToolbarExtras/>", () => {
  it("renders nothing extra when the host does not use it", async () => {
    const { container } = await render(<Excalidraw />);
    expect(container.querySelector("[data-testid=host-tool]")).toBe(null);
  });

  it("renders the host buttons inside the toolbar, right after the eraser", async () => {
    const { container } = await render(
      <Excalidraw>
        <ToolbarExtras>
          <button data-testid="host-tool">GIF</button>
        </ToolbarExtras>
      </Excalidraw>,
    );
    const hostTool = container.querySelector("[data-testid=host-tool]");
    expect(hostTool).not.toBe(null);
    const toolbar = container.querySelector(".App-toolbar");
    expect(toolbar?.contains(hostTool)).toBe(true);
    const eraser = container.querySelector("[data-testid=toolbar-eraser]");
    expect(eraser).not.toBe(null);
    // the eraser precedes the host button in document order
    expect(
      eraser!.compareDocumentPosition(hostTool!) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});
