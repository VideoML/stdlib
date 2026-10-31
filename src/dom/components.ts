const parseProps = (value: string | null) => {
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
};

const clear = (el: HTMLElement) => {
  while (el.firstChild) el.removeChild(el.firstChild);
};

const makeText = (text: string, style: Partial<CSSStyleDeclaration>) => {
  const node = document.createElement("div");
  node.textContent = text;
  Object.assign(node.style, style);
  return node;
};

const BaseElement = (typeof HTMLElement === "undefined" ? class {} : HTMLElement) as typeof HTMLElement;

const BASE_FONT = "\"DM Sans\", \"Helvetica Neue\", Arial, sans-serif";
const HEADING_FONT = "\"Space Grotesk\", \"Helvetica Neue\", Arial, sans-serif";

const BRAND_COLORS = {
  notBlack: "#0f1117",
  notWhite: "#e8eaf0",
  muted: "#9aa4b2",
  accent: "#7aa2f7",
};

const readCssVar = (el: Element, name: string) => {
  const value = getComputedStyle(el).getPropertyValue(name).trim();
  return value || null;
};

const resolveTheme = (root: HTMLElement | null) => {
  const scope = root ?? document.documentElement;
  const background = readCssVar(scope, "--background");
  const surface = readCssVar(scope, "--card");
  const text = readCssVar(scope, "--foreground");
  const muted = readCssVar(scope, "--muted-foreground");
  const accent = readCssVar(scope, "--primary");
  const recess = readCssVar(scope, "--recess");
  const format = (value: string | null, fallback: string) => (value ? `hsl(${value})` : fallback);
  return {
    background: format(background, BRAND_COLORS.notBlack),
    surface: format(surface, "#111827"),
    text: format(text, BRAND_COLORS.notWhite),
    muted: format(muted, BRAND_COLORS.muted),
    accent: format(accent, BRAND_COLORS.accent),
    recess: format(recess, "#0b1220"),
  };
};

const getRootTheme = (el: HTMLElement) => {
  const root = el.closest("vml, videoml, video-ml") as HTMLElement | null;
  return resolveTheme(root);
};

const makeCard = (padding = 32) => {
  const node = document.createElement("div");
  const theme = resolveTheme(node.closest?.("vml, videoml, video-ml") as HTMLElement | null);
  Object.assign(node.style, {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    padding: `${padding}px`,
    borderRadius: "18px",
    background: theme.surface,
    color: theme.text,
    fontFamily: BASE_FONT,
    boxSizing: "border-box",
    width: "100%",
  });
  return node;
};

class TitleSlideElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      height: "100%",
      width: "100%",
      color: props.color ?? theme.text,
      fontFamily: BASE_FONT,
      textAlign: "center",
      padding: "72px",
      boxSizing: "border-box",
    });
    if (props.eyebrow) {
      wrap.appendChild(makeText(String(props.eyebrow), { fontSize: "18px", letterSpacing: "0.24em", textTransform: "uppercase", opacity: "0.6", marginBottom: "18px", fontFamily: BASE_FONT }));
    }
    if (props.title) {
      wrap.appendChild(makeText(String(props.title), { fontSize: "64px", fontWeight: "600", marginBottom: "18px", fontFamily: HEADING_FONT }));
    }
    if (props.subtitle) {
      wrap.appendChild(makeText(String(props.subtitle), { fontSize: "28px", opacity: "0.8", fontFamily: BASE_FONT }));
    }
    this.appendChild(wrap);
  }
}

class BulletListElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
      padding: "64px 72px",
      boxSizing: "border-box",
      color: props.color ?? theme.text,
      fontFamily: BASE_FONT,
    });
    if (props.eyebrow) {
      wrap.appendChild(makeText(String(props.eyebrow), { fontSize: "18px", letterSpacing: "0.24em", textTransform: "uppercase", opacity: "0.6" }));
    }
    if (props.title) {
      wrap.appendChild(makeText(String(props.title), { fontSize: "48px", fontWeight: "600", fontFamily: HEADING_FONT }));
    }
    if (props.subtitle) {
      wrap.appendChild(makeText(String(props.subtitle), { fontSize: "24px", opacity: "0.8" }));
    }
    const list = document.createElement("ul");
    Object.assign(list.style, { margin: "0", paddingLeft: "28px", fontSize: "26px", lineHeight: "1.45" });
    const items = props?.bullets?.items ?? [];
    for (const item of items) {
      const li = document.createElement("li");
      li.textContent = String(item);
      list.appendChild(li);
    }
    wrap.appendChild(list);
    this.appendChild(wrap);
  }
}

class MotionBarsElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  private barNodes: HTMLElement[] = [];
  private tickHandler?: (event: Event) => void;
  connectedCallback() {
    this.render();
    this.bindTimeline();
  }
  disconnectedCallback() {
    const root = this.closest("vml, videoml, video-ml");
    if (root && this.tickHandler) {
      root.removeEventListener("timeline:tick", this.tickHandler as EventListener);
    }
  }
  attributeChangedCallback() {
    this.render();
  }
  bindTimeline() {
    const root = this.closest("vml, videoml, video-ml");
    if (!root) return;
    if (this.tickHandler) {
      root.removeEventListener("timeline:tick", this.tickHandler as EventListener);
    }
    this.tickHandler = (event: Event) => {
      const detail = (event as CustomEvent).detail as { time?: number };
      const time = detail?.time ?? 0;
      this.barNodes.forEach((bar, idx) => {
        const base = Number.parseFloat(bar.dataset.base ?? "1");
        const scale = 0.7 + 0.3 * Math.sin(time * 2 + idx);
        bar.style.transform = `scaleY(${Math.max(0.1, base * scale)})`;
      });
    };
    root.addEventListener("timeline:tick", this.tickHandler as EventListener);
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "18px",
      padding: "64px 72px",
      boxSizing: "border-box",
      color: props.color ?? theme.text,
      fontFamily: BASE_FONT,
      height: "100%",
      justifyContent: "center",
    });
    if (props.eyebrow) {
      wrap.appendChild(makeText(String(props.eyebrow), { fontSize: "18px", letterSpacing: "0.24em", textTransform: "uppercase", opacity: "0.6" }));
    }
    if (props.title) {
      wrap.appendChild(makeText(String(props.title), { fontSize: "48px", fontWeight: "600", fontFamily: HEADING_FONT }));
    }
    if (props.subtitle) {
      wrap.appendChild(makeText(String(props.subtitle), { fontSize: "24px", opacity: "0.8" }));
    }

    const chart = document.createElement("div");
    Object.assign(chart.style, {
      display: "grid",
      gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
      gap: "18px",
      alignItems: "end",
      height: "320px",
      paddingTop: "8px",
    });

    const values = Array.isArray(props.values) ? props.values : [38, 52, 24, 71, 43, 66];
    const labels = Array.isArray(props.labels) ? props.labels : [];
    const max = Math.max(...values.map((v: number) => Number(v) || 0), 1);
    const accent = props.accent ?? theme.accent;
    this.barNodes = [];

    values.forEach((raw: number, idx: number) => {
      const base = (Number(raw) || 0) / max;
      const col = document.createElement("div");
      Object.assign(col.style, { display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" });
      const bar = document.createElement("div");
      bar.dataset.base = String(base);
      Object.assign(bar.style, {
        width: "100%",
        height: `${Math.max(0.1, base) * 100}%`,
        background: accent,
        borderRadius: "12px",
        transformOrigin: "bottom",
        transform: `scaleY(${Math.max(0.1, base)})`,
        transition: "none",
        willChange: "transform",
      });
      const label = document.createElement("div");
      label.textContent = String(labels[idx] ?? "");
      Object.assign(label.style, { fontSize: "14px", opacity: "0.7", textAlign: "center" });
      col.appendChild(bar);
      if (label.textContent) col.appendChild(label);
      chart.appendChild(col);
      this.barNodes.push(bar);
    });

    wrap.appendChild(chart);
    this.appendChild(wrap);
  }
}

class TwoColumnElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "grid",
      gridTemplateColumns: "1fr 1fr",
      gap: "32px",
      padding: "64px 72px",
      boxSizing: "border-box",
      color: props.color ?? theme.text,
      fontFamily: BASE_FONT,
      height: "100%",
    });
    const header = document.createElement("div");
    header.style.gridColumn = "1 / -1";
    if (props.eyebrow) header.appendChild(makeText(String(props.eyebrow), { fontSize: "18px", letterSpacing: "0.24em", textTransform: "uppercase", opacity: "0.6" }));
    if (props.title) header.appendChild(makeText(String(props.title), { fontSize: "48px", fontWeight: "600", fontFamily: HEADING_FONT }));
    if (props.subtitle) header.appendChild(makeText(String(props.subtitle), { fontSize: "24px", opacity: "0.8" }));
    wrap.appendChild(header);

    const left = document.createElement("div");
    const right = document.createElement("div");
    left.appendChild(makeText(props?.left?.props?.label ?? "Left", { fontSize: "22px", fontWeight: "600", marginBottom: "12px", fontFamily: HEADING_FONT }));
    left.appendChild(makeText(props?.left?.props?.text ?? "", { fontSize: "20px", opacity: "0.85" }));
    right.appendChild(makeText(props?.right?.props?.label ?? "Right", { fontSize: "22px", fontWeight: "600", marginBottom: "12px", fontFamily: HEADING_FONT }));
    right.appendChild(makeText(props?.right?.props?.text ?? "", { fontSize: "20px", opacity: "0.85" }));
    wrap.appendChild(left);
    wrap.appendChild(right);

    this.appendChild(wrap);
  }
}

class ChapterHeadingElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "flex",
      alignItems: "center",
      gap: "32px",
      padding: "64px 72px",
      boxSizing: "border-box",
      color: props.color ?? theme.text,
      fontFamily: BASE_FONT,
      height: "100%",
    });
    const showNumber = props.showNumber !== false;
    const number = makeText(String(props.number ?? "01"), { fontSize: "80px", fontWeight: "700", opacity: "0.8", fontFamily: HEADING_FONT });
    const titles = document.createElement("div");
    if (props.title) titles.appendChild(makeText(String(props.title), { fontSize: "48px", fontWeight: "600", fontFamily: HEADING_FONT }));
    if (props.subtitle) titles.appendChild(makeText(String(props.subtitle), { fontSize: "24px", opacity: "0.8" }));
    if (showNumber) wrap.appendChild(number);
    wrap.appendChild(titles);
    this.appendChild(wrap);
  }
}

class VideoTitleElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const node = makeText(String(props.text ?? ""), {
      position: "absolute",
      left: `${props?.position?.x ?? 0}px`,
      top: `${props?.position?.y ?? 0}px`,
      fontSize: `${props.fontSize ?? 48}px`,
      color: props.color ?? theme.text,
      fontFamily: HEADING_FONT,
      fontWeight: "600",
    });
    this.appendChild(node);
  }
}

class VideoSubtitleElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const node = makeText(String(props.text ?? ""), {
      position: "absolute",
      left: `${props?.position?.x ?? 0}px`,
      top: `${props?.position?.y ?? 0}px`,
      fontSize: `${props.fontSize ?? 32}px`,
      color: props.color ?? theme.muted,
      fontFamily: BASE_FONT,
      fontWeight: "400",
    });
    this.appendChild(node);
  }
}

class VideoRectangleElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const node = document.createElement("div");
    Object.assign(node.style, {
      position: "absolute",
      left: `${props?.position?.x ?? 0}px`,
      top: `${props?.position?.y ?? 0}px`,
      width: `${props.width ?? 100}px`,
      height: `${props.height ?? 100}px`,
      background: props.color ?? theme.background,
    });
    this.appendChild(node);
  }
}

class BackgroundElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const node = document.createElement("div");
    Object.assign(node.style, {
      position: "absolute",
      inset: "0",
      width: "100%",
      height: "100%",
      background: props.color ?? props.background ?? theme.background,
    });
    this.appendChild(node);
  }
}

class ProgressBarElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "32px",
      width: "100%",
      boxSizing: "border-box",
      color: theme.text,
      fontFamily: BASE_FONT,
    });
    const label = props.label ?? props.title ?? "Progress";
    wrap.appendChild(makeText(String(label), { fontSize: "20px", opacity: "0.8" }));
    const bar = document.createElement("div");
    Object.assign(bar.style, {
      height: "12px",
      background: theme.surface,
      borderRadius: "999px",
      overflow: "hidden",
    });
    const fill = document.createElement("div");
    const pct = Math.max(0, Math.min(100, Number(props.progress ?? props.percent ?? 50)));
    Object.assign(fill.style, {
      height: "100%",
      width: `${pct}%`,
      background: theme.accent,
    });
    bar.appendChild(fill);
    wrap.appendChild(bar);
    this.appendChild(wrap);
  }
}

class QuoteCardElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const card = makeCard(36);
    card.style.background = theme.surface;
    card.style.color = theme.text;
    card.appendChild(makeText(`“${props.quote ?? props.text ?? "Quote"}”`, { fontSize: "30px", lineHeight: "1.4", fontFamily: HEADING_FONT }));
    if (props.attribution || props.author) {
      card.appendChild(makeText(String(props.attribution ?? props.author), { fontSize: "18px", opacity: "0.7" }));
    }
    this.appendChild(card);
  }
}

class LowerThirdElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const card = makeCard(20);
    card.style.background = theme.surface;
    card.style.color = theme.text;
    Object.assign(card.style, { position: "absolute", left: "48px", bottom: "48px", maxWidth: "520px" });
    if (props.title || props.name) {
      card.appendChild(makeText(String(props.title ?? props.name), { fontSize: "26px", fontWeight: "600", fontFamily: HEADING_FONT }));
    }
    if (props.subtitle || props.role) {
      card.appendChild(makeText(String(props.subtitle ?? props.role), { fontSize: "18px", opacity: "0.8" }));
    }
    this.appendChild(card);
  }
}

class CalloutElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const card = makeCard(28);
    card.style.background = theme.surface;
    card.style.color = theme.text;
    Object.assign(card.style, { maxWidth: "720px", margin: "48px" });
    if (props.title) {
      card.appendChild(makeText(String(props.title), { fontSize: "28px", fontWeight: "600" }));
    }
    if (props.body || props.text) {
      card.appendChild(makeText(String(props.body ?? props.text), { fontSize: "20px", opacity: "0.85" }));
    }
    this.appendChild(card);
  }
}

class ChyronElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const card = makeCard(18);
    card.style.background = theme.surface;
    card.style.color = theme.text;
    Object.assign(card.style, { position: "absolute", left: "48px", bottom: "48px", maxWidth: "640px" });
    card.appendChild(makeText(String(props.label ?? props.title ?? "Chyron"), { fontSize: "18px", opacity: "0.7" }));
    if (props.text) {
      card.appendChild(makeText(String(props.text), { fontSize: "22px" }));
    }
    this.appendChild(card);
  }
}

class CodeBlockElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const pre = document.createElement("pre");
    pre.textContent = String(props.code ?? props.text ?? "// code");
    Object.assign(pre.style, {
      background: theme.recess ?? theme.surface,
      color: theme.text,
      padding: "24px",
      borderRadius: "18px",
      fontSize: "18px",
      fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
      lineHeight: "1.5",
      margin: "48px",
      whiteSpace: "pre-wrap",
    });
    this.appendChild(pre);
  }
}

class ContentScreenElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "flex",
      flexDirection: "column",
      gap: "12px",
      padding: "64px",
      color: theme.text,
      fontFamily: BASE_FONT,
    });
    if (props.title) wrap.appendChild(makeText(String(props.title), { fontSize: "48px", fontWeight: "600", fontFamily: HEADING_FONT }));
    if (props.subtitle) wrap.appendChild(makeText(String(props.subtitle), { fontSize: "24px", opacity: "0.8" }));
    this.appendChild(wrap);
  }
}

class GridScreenElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "16px",
      padding: "48px",
      color: theme.text,
      fontFamily: BASE_FONT,
    });
    const items = props.items ?? [];
    if (props.title) {
      const header = document.createElement("div");
      header.style.gridColumn = "1 / -1";
      header.appendChild(makeText(String(props.title), { fontSize: "36px", fontWeight: "600", fontFamily: HEADING_FONT }));
      wrap.appendChild(header);
    }
    for (const item of items) {
      const card = makeCard(20);
      card.appendChild(makeText(String(item?.title ?? item?.label ?? "Item"), { fontSize: "20px", fontWeight: "600", fontFamily: HEADING_FONT }));
      if (item?.text) {
        card.appendChild(makeText(String(item.text), { fontSize: "16px", opacity: "0.8" }));
      }
      wrap.appendChild(card);
    }
    this.appendChild(wrap);
  }
}

class ThreeColumnElement extends BaseElement {
  static get observedAttributes() {
    return ["props"];
  }
  connectedCallback() {
    this.render();
  }
  attributeChangedCallback() {
    this.render();
  }
  render() {
    const props = parseProps(this.getAttribute("props"));
    clear(this);
    const theme = getRootTheme(this);
    const wrap = document.createElement("div");
    Object.assign(wrap.style, {
      display: "grid",
      gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
      gap: "24px",
      padding: "64px",
      color: theme.text,
      fontFamily: BASE_FONT,
    });
    const columns = props.columns ?? [];
    for (const col of columns) {
      const card = makeCard(24);
      card.appendChild(makeText(String(col?.title ?? "Column"), { fontSize: "22px", fontWeight: "600", fontFamily: HEADING_FONT }));
      if (col?.text) {
        card.appendChild(makeText(String(col.text), { fontSize: "18px", opacity: "0.85" }));
      }
      wrap.appendChild(card);
    }
    this.appendChild(wrap);
  }
}

class DemoPlaceholderElement extends BaseElement {
  connectedCallback() {
    if (this.childNodes.length) return;
    const card = makeCard(24);
    card.appendChild(makeText(`Demo: <${this.tagName.toLowerCase()}>`, { fontSize: "20px", fontWeight: "600" }));
    card.appendChild(makeText("This demo component is a placeholder in the DOM runtime.", { fontSize: "16px", opacity: "0.75" }));
    this.appendChild(card);
  }
}

export const registerVideoMLComponents = () => {
  if (typeof window === "undefined" || !("customElements" in window)) return;
  const define = (name: string, ctor: CustomElementConstructor) => {
    if (!customElements.get(name)) {
      customElements.define(name, ctor);
    }
  };
  const defineAlias = (name: string, Base: CustomElementConstructor) => {
    class AliasElement extends (Base as typeof HTMLElement) {}
    define(name, AliasElement);
  };

  define("title-slide", TitleSlideElement);
  defineAlias("title-slide-layout-demo", TitleSlideElement);
  defineAlias("bullet-list-screen", BulletListElement);
  defineAlias("bullet-list", BulletListElement);
  defineAlias("two-column-screen", TwoColumnElement);
  defineAlias("two-column-layout-demo", TwoColumnElement);
  define("chapter-heading", ChapterHeadingElement);
  define("content-screen", ContentScreenElement);
  define("grid-screen", GridScreenElement);
  define("three-column-screen", ThreeColumnElement);
  define("video-title", VideoTitleElement);
  define("video-subtitle", VideoSubtitleElement);
  define("video-rectangle", VideoRectangleElement);
  define("video-background", BackgroundElement);
  define("motion-bars", MotionBarsElement);
  define("progress-bar", ProgressBarElement);
  define("quote-card", QuoteCardElement);
  define("lower-third", LowerThirdElement);
  define("video-callout", CalloutElement);
  define("video-chyron", ChyronElement);
  define("code-block", CodeBlockElement);
  defineAlias("anime-harness-demo", DemoPlaceholderElement);
  defineAlias("d3-bar-chart", DemoPlaceholderElement);
  defineAlias("framer-motion-demo", DemoPlaceholderElement);
  defineAlias("lottie-badge", DemoPlaceholderElement);
  defineAlias("mix-and-match-demo", DemoPlaceholderElement);
  defineAlias("p5-particles", DemoPlaceholderElement);
  defineAlias("p5-neon-field", DemoPlaceholderElement);
  defineAlias("text-effects-demo", DemoPlaceholderElement);
  defineAlias("three-orbit", DemoPlaceholderElement);
  defineAlias("content-layout-demo", DemoPlaceholderElement);
  defineAlias("not-video", DemoPlaceholderElement);
};

class FallbackElement extends BaseElement {
  connectedCallback() {
    if (this.childNodes.length) return;
    const label = document.createElement("div");
    label.textContent = `<${this.tagName.toLowerCase()}>`;
    Object.assign(label.style, {
      fontFamily: "system-ui, sans-serif",
      fontSize: "14px",
      opacity: "0.6",
      padding: "8px",
    });
    this.appendChild(label);
  }
}

export const registerFallbackComponents = (root: Element) => {
  if (typeof window === "undefined" || !("customElements" in window)) return;
  const tags = new Set<string>();
  const elements = [root, ...Array.from(root.querySelectorAll("*"))];
  for (const el of elements) {
    const tag = el.tagName.toLowerCase();
    if (!tag.includes("-") || tag === "frame-effect") continue;
    tags.add(tag);
  }
  for (const tag of tags) {
    if (!customElements.get(tag)) {
      customElements.define(tag, FallbackElement);
    }
  }
};
