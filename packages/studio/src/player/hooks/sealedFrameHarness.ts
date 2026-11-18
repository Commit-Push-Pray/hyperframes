// The frame's real runtime agent, serving the opaque frame from this document as Studio's marked preview page.
import { installMarkedEditingAgent } from "../../../../core/src/runtime/editingAgent.test-helpers";
import { detachedFakeIframe } from "./timelinePlayerTestHarness";

/** The opaque frame as a browser hands it over: every property but `postMessage` throws, `__clipTree` included. */
export function crossOriginFrame(closers: Array<() => void>): HTMLIFrameElement {
  const target: Record<string, unknown> = {};
  const frame = new Proxy(target, {
    get: (raw, key) => {
      if (key === "postMessage") return raw.postMessage;
      throw new DOMException("blocked", "SecurityError");
    },
  });
  const iframe = detachedFakeIframe(frame);
  Object.defineProperty(iframe, "contentDocument", { value: null });
  const parent = {
    postMessage: (data: unknown, _origin: string, ports: MessagePort[]) =>
      window.dispatchEvent(
        new MessageEvent("message", { source: frame as unknown as Window, data, ports }),
      ),
  } as unknown as Window;
  const agent = installMarkedEditingAgent(parent);
  target.postMessage = (data: unknown) =>
    window.dispatchEvent(new MessageEvent("message", { source: parent, data }));
  closers.push(() => agent.dispose());
  return iframe;
}
