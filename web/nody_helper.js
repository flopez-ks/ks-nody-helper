// web/nody_helper.js
// global variables
import { app } from "/scripts/app.js";
import { api } from "/scripts/api.js";

let nodyDragFromId = null;

console.log("[NODY] extension loaded", { app, api }); // ✓

app.registerExtension({
  // added catch e and calls observeOverlays function
  name: "ks.nody.helper",
  async setup() {
    console.log("[NODY] setup running"); // ✓

    try {
      const res = await api.fetchApi("/nody/ping");
      console.log("[NODY] ping:", await res.json()); // ✓
    } catch (e) {
      console.error("[NODY] ping failed:", e);
    }

    observeOverlays();
  },
});

function captureDragFromId() { // not working rn
  const c = app.canvas;

  // Newer ComfyUI builds often use connecting_links (array)
  const links = c?.connecting_links || c?._connecting_links;
  if (Array.isArray(links) && links.length) {
    const nodeId = links[0]?.node?.id ?? null;
    return nodeId;
  }

  // Older builds sometimes expose connecting_node directly // not sure what ver we all have 
  const nodeId = c?.connecting_node?.id ?? null;
  if (nodeId != null) return nodeId;

  return null;
}

function tryMarkSearchOverlay(root = document) {
  const pv = root.querySelector?.("div.p-autocomplete-overlay.p-component");
  if (!pv) return false;

  const dragId = captureDragFromId();
  if (dragId != null) {
    nodyDragFromId = dragId;
    console.log("[NODY] cached drag-from id:", nodyDragFromId); //X
  }


  // Inject a fixed first-row input + send button (once)
  if (!pv.querySelector("[data-nody-bar='1']")) {
    const bar = document.createElement("div");
    bar.dataset.nodyBar = "1";

    // first row, neat!
    bar.style.display = "flex";
    bar.style.gap = "10px";
    bar.style.alignItems = "center";
    bar.style.width = "100%";
    bar.style.padding = "10px 12px";
    bar.style.boxSizing = "border-box";
    bar.style.fontSize = "16px"; // easier to read

    // Optional: make it visually separated from the list // i like this
    bar.style.borderBottom = "1px solid rgba(255,255,255,0.12)";

    const input = document.createElement("input");
    input.type = "text";
    input.placeholder = "Ask Nody...";
    input.dataset.nodyInput = "1";

    // Input should take most of the row
    input.style.flex = "1";
    input.style.minWidth = "0";
    input.style.padding = "8px 10px";
    input.style.borderRadius = "10px";
    input.style.border = "1px solid rgba(255,255,255,0.18)";
    input.style.background = "rgba(0,0,0,0.35)";
    input.style.color = "white";
    input.style.outline = "none";
    input.style.fontSize = "16px"; //easier to read
    input.style.lineHeight = "20px"; // easier to read
    input.style.height = "38px"; // fancy thing to make reading more enjoyable

    const send = document.createElement("button");
    send.textContent = "Send";
    send.dataset.nodySend = "1";

    // Small button next to input
    send.style.flex = "0 0 auto";
    send.style.padding = "8px 12px";
    send.style.borderRadius = "10px";
    send.style.border = "1px solid rgba(255,255,255,0.18)";
    send.style.background = "rgba(0,0,0,0.6)";
    send.style.color = "white";
    send.style.cursor = "pointer";
    send.style.fontSize = "16px"; //easier to read
    send.style.lineHeight = "20px"; // easier to read
    send.style.height = "38px"; // fancy thing to make reading more enjoyable

/* LAST WORKING
    const submit = (e) => {
      e?.preventDefault?.();
      e?.stopPropagation?.(); // what it does: Don’t let this click travel upward to the parents of the overlay window

      // --- rudimentary click feedback  --- not sure if this is the best way to do it
      const prevBg = send.style.background;
      const prevBorder = send.style.border;

      send.style.background = "rgba(255,255,255,0.25)";
      send.style.border = "1px solid rgba(255,255,255,0.55)";

      setTimeout(() => {
        send.style.background = prevBg;
        send.style.border = prevBorder;
      }, 120);
      // --- end feedback ---

      console.log("[NODY] input:", input.value);
      const prompt = await app.graphToPrompt();

    };
*/

const submit = async (e) => {
  e?.preventDefault?.();
  e?.stopPropagation?.(); // Don’t let this click travel upward to parent elements

  // --- rudimentary click feedback ---
  const prevBg = send.style.background;
  const prevBorder = send.style.border;

  send.style.background = "rgba(255,255,255,0.25)";
  send.style.border = "1px solid rgba(255,255,255,0.55)";

  setTimeout(() => {
    send.style.background = prevBg;
    send.style.border = prevBorder;
  }, 120);
  // --- end feedback ---

  console.log("[NODY] input:", input.value);

  const prompt = await app.graphToPrompt();
  const fullWorkflowJson = prompt.workflow; // entire workflow graph
  const apiPromptJson = prompt.output;      // API prompt format

  // selected and dragged nodes:
  const selectedMap = app.canvas?.selected_nodes || {};
  const selectedIds = Object.keys(selectedMap);
  const selectedId = selectedIds.length ? Number(selectedIds[selectedIds.length - 1]) : null;

  // Fallback: if nothing is selected, try the node you're currently dragging a connection from
  const draggingFromId = selectedId == null ? nodyDragFromId : null;

  console.log("[NODY] workflow nodes:", fullWorkflowJson?.nodes?.length);
  console.log("[NODY] api prompt keys:", Object.keys(apiPromptJson || {}).length);
  console.log("[NODY] selected node id:", selectedId);
  console.log("[NODY] dragged node (cached):", draggingFromId);
};


    send.addEventListener("click", submit);

    // Bonus: press Enter to send
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit(e);
      // stop overlay keyboard handlers from hijacking Enter
      e.stopPropagation();
    });

    // Stop clicks inside the bar from bubbling up to overlay handlers
    bar.addEventListener("click", (e) => e.stopPropagation());

    bar.appendChild(input);
    bar.appendChild(send);

    // Put the bar as the first "row"
    pv.prepend(bar);

    console.log("[NODY] Injected input bar");
  }

  return true;
}
function observeOverlays() {
  tryMarkSearchOverlay(document);

  const obs = new MutationObserver((mutations) => {
    for (const m of mutations) {
      for (const node of m.addedNodes) {
        if (!(node instanceof HTMLElement)) continue;
        if (tryMarkSearchOverlay(node) || tryMarkSearchOverlay(document))
          return; // checking the whole page ugh and all the nodes ugh
      }
    }
  });

  obs.observe(document.body, { childList: true, subtree: true }); // watches the entire page
  console.log("[NODY] MutationObserver attached"); // ✓
}

