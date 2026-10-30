import type { ElementHandle, Page } from "playwright";

import type {
  EventSchemaRow,
  InspectedElement,
  SelectorCandidate,
  SelectorType,
  WebsiteResolvedEvent,
} from "./types";

// ============================================================
// CONFIG
// ============================================================

const MAX_ELEMENTS = 700;
const MAX_CANDIDATES = 50;
const MAX_ATTRIBUTE_LENGTH = 180;
const MAX_TEXT_LENGTH = 220;
const MAX_HTML_LENGTH = 3000;
const MAX_ANCESTOR_DEPTH = 8;

// ============================================================
// INTERACTIVE ELEMENTS
// ============================================================

const INTERACTIVE_SELECTOR = [
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "summary",
  "label",
  "[role='button']",
  "[role='link']",
  "[role='tab']",
  "[role='menuitem']",
  "[role='checkbox']",
  "[role='radio']",
  "[role='option']",
  "[role='switch']",
  "[role='combobox']",
  "[tabindex]:not([tabindex='-1'])",
  "[onclick]",
].join(",");

// ============================================================
// STABLE DATA ATTRIBUTES
// ============================================================

const STABLE_DATA_ATTRIBUTES = new Set([
  "data-testid",
  "data-test-id",
  "data-test",
  "data-cy",
  "data-qa",
  "data-qa-id",
  "data-automation",
  "data-automation-id",
  "data-track",
  "data-tracking",
  "data-event",
  "data-event-name",
  "data-action",
  "data-action-name",
  "data-component",
  "data-component-name",
]);

// ============================================================
// STABLE ARIA ATTRIBUTES
// ============================================================

const STABLE_ARIA_ATTRIBUTES = new Set([
  "aria-label",
  "aria-labelledby",
  "aria-describedby",
  "aria-controls",
  "aria-current",
  "aria-expanded",
  "aria-haspopup",
  "aria-selected",
  "aria-pressed",
  "aria-roledescription",
]);

// ============================================================
// UNSTABLE ATTRIBUTES
// ============================================================

const UNSTABLE_ATTRIBUTES = new Set([
  "style",
  "onclick",
  "onchange",
  "onload",
  "onmouseover",
  "onmouseout",
  "onmouseenter",
  "onmouseleave",
  "onfocus",
  "onblur",
  "data-reactid",
  "data-react-checksum",
]);

// ============================================================
// GENERIC WORDS
// ============================================================

const GENERIC_WORDS = new Set([
  "click",
  "clicked",
  "clicks",
  "button",
  "buttons",
  "link",
  "links",
  "user",
  "users",
  "when",
  "the",
  "a",
  "an",
  "on",
  "any",
  "page",
  "website",
  "section",
  "under",
  "in",
  "to",
  "of",
  "and",
  "with",
  "for",
  "this",
  "that",
  "from",
  "current",
  "pass",
  "name",
  "event",
  "custom",
  "tracking",
  "track",
  "true",
  "false",
]);

// ============================================================
// TYPES
// ============================================================

type ElementHandleOfElement = ElementHandle<Element>;

type RawElement = {
  tagName: string;
  id?: string;
  classes: string[];
  text: string;
  href?: string;
  src?: string;
  alt?: string;
  title?: string;
  role?: string;
  type?: string;
  name?: string;
  ariaLabel?: string;
  attributes: Record<string, string>;
  dataAttributes: Record<string, string>;
  outerHTML: string;
  depth: number;
  isInteractive: boolean;
  interactiveTag: string;
  sectionTag?: string;
  sectionId?: string;
  sectionHeading?: string;
  ancestorText: string[];
  ancestorTags: string[];
  ancestorIds: string[];
  ancestorClasses: string[];
  descendantImageAlt: string;
  visible: boolean;
};

type EventSignals = {
  allText: string;
  explicitTerms: string[];
  actionTerms: string[];
  sectionTerms: string[];
  categoryTerms: string[];
  urlTerms: string[];
  scenarioTerms: string[];
  pageTerms: string[];
  eventNameTerms: string[];
  menuTerms: string[];
};

// ============================================================
// SAFE STRING HELPERS
// ============================================================

function clean(
  value: unknown,
  maxLength = MAX_ATTRIBUTE_LENGTH
): string {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalize(value: unknown): string {
  return clean(value, 1200)
    .toLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function words(value: unknown): string[] {
  const normalized = normalize(value);

  if (!normalized) {
    return [];
  }

  return Array.from(
    new Set(
      normalized
        .split(" ")
        .map((word) => word.trim())
        .filter(
          (word) =>
            word.length >= 2 &&
            !GENERIC_WORDS.has(word)
        )
    )
  );
}

// ============================================================
// CSS ESCAPING
// ============================================================

function escapeCss(value: string): string {
  if (
    typeof CSS !== "undefined" &&
    typeof CSS.escape === "function"
  ) {
    return CSS.escape(value);
  }

  return value.replace(
    /[^a-zA-Z0-9_-]/g,
    (character) => `\\${character}`
  );
}

function escapeAttribute(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\A ");
}

function escapeSingleQuote(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/'/g, "\\'");
}

// ============================================================
// DYNAMIC VALUE CHECK
// ============================================================

function looksGenerated(value: string): boolean {
  const normalized = value.trim();

  if (!normalized) {
    return true;
  }

  if (/^[0-9]{6,}$/.test(normalized)) {
    return true;
  }

  if (/^[a-f0-9]{16,}$/i.test(normalized)) {
    return true;
  }

  if (
    /^[a-z0-9]{24,}$/i.test(normalized) &&
    !/[._:-]/.test(normalized)
  ) {
    return true;
  }

  if (/^:r[a-z0-9]+:$/i.test(normalized)) {
    return true;
  }

  if (
    /^(react|radix|ember|mui|chakra|headlessui)[-_]/i.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
}

// ============================================================
// URL HELPERS
// ============================================================

function parseUrl(
  value: string
): URL | null {
  try {
    return new URL(
      value,
      "https://selector.local"
    );
  } catch {
    return null;
  }
}

function getUrlPathname(
  value: string
): string {
  const url = parseUrl(value);

  if (!url) {
    return "";
  }

  return url.pathname || "";
}

function isTrackingParameter(
  name: string
): boolean {
  return /^(utm_|fbclid|gclid|msclkid|_gl|mc_cid|mc_eid)$/i.test(name);
}

function isUsefulHref(
  href: string
): boolean {
  if (!href.trim()) {
    return false;
  }

  const url = parseUrl(href);

  if (!url) {
    return false;
  }

  return true;
}

// ============================================================
// ATTRIBUTE STABILITY
// ============================================================

function isStableAttribute(name: string, value: string): boolean {
  const normalizedName = name.toLowerCase();

  const normalizedValue = clean(value);

  if (!normalizedValue) {
    return false;
  }

  if (normalizedValue.length > MAX_ATTRIBUTE_LENGTH) {
    return false;
  }

  if (UNSTABLE_ATTRIBUTES.has(normalizedName)) {
    return false;
  }

  if (looksGenerated(normalizedValue)) {
    return false;
  }

  return true;
}

function isStableId(
  value: string
): boolean {
  const id = value.trim();

  if (!id) {
    return false;
  }

  if (/^(root|app|__next|main|container)$/i.test(id)) {
    return false;
  }

  return isStableAttribute("id", id);
}

// ============================================================
// CANDIDATE FACTORY
// ============================================================

function createCandidate(
  selector: string,
  selectorType: SelectorType,
  reason: string,
  stabilityScore: number,
  specificityScore: number,
  depth = 1
): SelectorCandidate {
  return {
    selector,
    selectorType,
    matchCount: 0,
    targetMatched: false,
    score: 0,
    stabilityScore,
    specificityScore,
    depth,
    reason,
  };
}

// ============================================================
// RAW DOM EXTRACTION
// ============================================================

async function extractRawElement(
  handle: ElementHandleOfElement
): Promise<RawElement | null> {
  try {
    return await handle.evaluate(
      (element, config) => {
        const attributes: Record<string, string> = {};

        const dataAttributes: Record<string, string> = {};

        for (const attribute of Array.from(element.attributes)) {
          attributes[attribute.name] = attribute.value;

          if (attribute.name.toLowerCase().startsWith("data-")) {
            dataAttributes[attribute.name] = attribute.value;
          }
        }

        const ancestors: Element[] = [];

        let current: | Element | null = element.parentElement;

        while (current && ancestors.length < config.maxAncestorDepth) {
          ancestors.push(current);

          current = current.parentElement;
        }

        const structuralContainer = ancestors.find((node) => /^(header|footer|nav|main|section|form)$/i.test(node.tagName));

        const headingCandidates = structuralContainer ? Array.from(structuralContainer.querySelectorAll("h1,h2,h3,h4,h5,h6"))
          : ancestors.flatMap(
            (node) =>
              Array.from(node.querySelectorAll("h1,h2,h3,h4,h5,h6")));

        const sectionHeading = headingCandidates.map((node) =>
          (node.textContent ?? "").replace(/\s+/g, " ").trim()).find(
            (value) => value.length > 0);

        const descendantImageAlt = Array.from(element.querySelectorAll("img[alt]"))
          .map((image) => image.getAttribute("alt") ?? "")
          .filter(Boolean)
          .join(" ")
          .slice(0, config.maxTextLength);

        const interactive = element.closest(config.interactiveSelector);

        const htmlElement = element as HTMLElement;

        const style = window.getComputedStyle(element);

        const rect = element.getBoundingClientRect();

        const visible = style.display !== "none" && style.visibility !== "hidden" &&
          Number(style.opacity || "1") > 0 &&
          rect.width > 0 &&
          rect.height > 0;

        let depth = 0;

        let depthNode: | Element | null =
          element;

        while (depthNode && depth < 100
        ) {
          depth += 1;
          depthNode = depthNode.parentElement;
        }

        const structural = ancestors.find(
          (node) => /^(header|footer|nav|main|section|form)$/i.test(node.tagName));

        return {
          tagName:
            element.tagName.toLowerCase(),

          id:
            element.getAttribute(
              "id"
            ) ||
            undefined,

          classes:
            Array.from(
              element.classList
            ).slice(0, 20),

          text:
            (
              htmlElement.innerText ||
              element.textContent ||
              ""
            )
              .replace(
                /\s+/g,
                " "
              )
              .trim()
              .slice(
                0,
                config.maxTextLength
              ),

          href:
            element instanceof
              HTMLAnchorElement
              ? element.getAttribute(
                "href"
              ) ||
              undefined
              : undefined,

          src:
            element instanceof
              HTMLImageElement
              ? element.getAttribute(
                "src"
              ) ||
              undefined
              : undefined,

          alt:
            element instanceof
              HTMLImageElement
              ? element.getAttribute(
                "alt"
              ) ||
              undefined
              : descendantImageAlt ||
              undefined,

          title:
            element.getAttribute(
              "title"
            ) ||
            undefined,

          role:
            element.getAttribute(
              "role"
            ) ||
            undefined,

          type:
            element.getAttribute(
              "type"
            ) ||
            undefined,

          name:
            element.getAttribute(
              "name"
            ) ||
            undefined,

          ariaLabel:
            element.getAttribute(
              "aria-label"
            ) ||
            undefined,

          attributes,

          dataAttributes,

          outerHTML:
            element.outerHTML.slice(
              0,
              config.maxHtmlLength
            ),

          depth,

          isInteractive:
            Boolean(
              interactive
            ),

          interactiveTag:
            interactive?.tagName.toLowerCase() ??
            element.tagName.toLowerCase(),

          sectionTag:
            structural?.tagName.toLowerCase(),

          sectionId:
            structural?.getAttribute(
              "id"
            ) ||
            undefined,

          sectionHeading,

          ancestorText:
            ancestors
              .map(
                (node) =>
                  (
                    node.textContent ??
                    ""
                  )
                    .replace(
                      /\s+/g,
                      " "
                    )
                    .trim()
                    .slice(
                      0,
                      180
                    )
              )
              .filter(Boolean)
              .slice(
                0,
                config.maxAncestorDepth
              ),

          ancestorTags:
            ancestors.map(
              (node) =>
                node.tagName.toLowerCase()
            ),

          ancestorIds:
            ancestors
              .map(
                (node) =>
                  node.getAttribute(
                    "id"
                  ) ?? ""
              )
              .filter(Boolean),

          ancestorClasses:
            ancestors
              .flatMap(
                (node) =>
                  Array.from(
                    node.classList
                  )
              )
              .slice(
                0,
                30
              ),

          descendantImageAlt,

          visible,
        };
      },
      {
        maxAncestorDepth:
          MAX_ANCESTOR_DEPTH,
        maxTextLength:
          MAX_TEXT_LENGTH,
        maxHtmlLength:
          MAX_HTML_LENGTH,
        interactiveSelector:
          INTERACTIVE_SELECTOR,
      }
    );
  } catch {
    return null;
  }
}

// ============================================================
// RAW -> INSPECTED
// ============================================================

function rawToInspected(
  raw: RawElement
): InspectedElement {
  return {
    tagName:
      raw.tagName,

    id:
      raw.id,

    classes:
      raw.classes,

    text:
      raw.text,

    href:
      raw.href,

    src:
      raw.src,

    alt:
      raw.alt,

    title:
      raw.title,

    role:
      raw.role,

    type:
      raw.type,

    name:
      raw.name,

    ariaLabel:
      raw.ariaLabel,

    ariaRole:
      raw.role,

    dataAttributes:
      raw.dataAttributes,

    attributes:
      raw.attributes,

    outerHTML:
      raw.outerHTML,

    depth:
      raw.depth,

    closestTag:
      raw.interactiveTag,

    closestId:
      raw.id,

    closestClasses:
      raw.classes,

    regionTag:
      raw.sectionTag,

    regionDepth:
      raw.sectionTag
        ? raw.ancestorTags.indexOf(
          raw.sectionTag
        ) + 1
        : undefined,
  };
}

// ============================================================
// RESOLVE INTERACTIVE ELEMENT
// ============================================================

export async function resolveInteractiveElement(
  handle: ElementHandleOfElement
): Promise<ElementHandleOfElement> {
  const resolved =
    await handle.evaluateHandle(
      (
        element,
        selector
      ) => {
        const interactive =
          element.closest(
            selector
          );

        return (
          interactive ??
          element
        );
      },
      INTERACTIVE_SELECTOR
    );

  const element =
    resolved.asElement();

  if (!element) {
    return handle;
  }

  return element as ElementHandleOfElement;
}

// ============================================================
// BASIC SELECTOR CANDIDATES
// ============================================================

function generateBasicCandidates(
  raw: RawElement
): SelectorCandidate[] {
  const candidates: SelectorCandidate[] =
    [];

  const tag =
    raw.tagName;

  // ----------------------------------------------------------
  // ID
  // ----------------------------------------------------------

  if (
    raw.id &&
    isStableId(raw.id)
  ) {
    candidates.push(
      createCandidate(
        `#${escapeCss(raw.id)}`,
        "id",
        "Stable DOM id",
        96,
        100
      )
    );
  }

  // ----------------------------------------------------------
  // DATA ATTRIBUTES
  // ----------------------------------------------------------

  for (
    const [name, value] of Object.entries(
      raw.dataAttributes
    )
  ) {
    const lowerName =
      name.toLowerCase();

    if (
      !STABLE_DATA_ATTRIBUTES.has(
        lowerName
      )
    ) {
      continue;
    }

    if (
      !isStableAttribute(
        name,
        value
      )
    ) {
      continue;
    }

    candidates.push(
      createCandidate(
        `${tag}[${name}="${escapeAttribute(
          value
        )}"]`,
        "attribute",
        `Stable ${name} attribute`,
        98,
        96
      )
    );
  }

  // ----------------------------------------------------------
  // ARIA
  // ----------------------------------------------------------

  for (
    const [name, value] of Object.entries(
      raw.attributes
    )
  ) {
    const lowerName =
      name.toLowerCase();

    if (
      !STABLE_ARIA_ATTRIBUTES.has(
        lowerName
      )
    ) {
      continue;
    }

    if (
      !isStableAttribute(
        name,
        value
      )
    ) {
      continue;
    }

    candidates.push(
      createCandidate(
        `${tag}[${name}="${escapeAttribute(
          value
        )}"]`,
        "aria",
        `Stable ${name} attribute`,
        91,
        91
      )
    );
  }

  // ----------------------------------------------------------
  // NORMAL ATTRIBUTES
  // ----------------------------------------------------------

  for (
    const name of [
      "name",
      "type",
      "title",
      "alt",
    ]
  ) {
    const value =
      raw.attributes[name];

    if (
      !value ||
      !isStableAttribute(
        name,
        value
      )
    ) {
      continue;
    }

    candidates.push(
      createCandidate(
        `${tag}[${name}="${escapeAttribute(
          value
        )}"]`,
        "attribute",
        `Stable ${name} attribute`,
        78,
        78
      )
    );
  }

  // ----------------------------------------------------------
  // ROLE
  // ----------------------------------------------------------

  if (
    raw.role &&
    isStableAttribute(
      "role",
      raw.role
    )
  ) {
    candidates.push(
      createCandidate(
        `${tag}[role="${escapeAttribute(
          raw.role
        )}"]`,
        "role",
        "Explicit ARIA role",
        82,
        84
      )
    );
  }

  return candidates;
}

// ============================================================
// HREF CANDIDATES
// ============================================================

function generateHrefCandidates(
  raw: RawElement
): SelectorCandidate[] {
  if (
    raw.tagName !== "a" ||
    !raw.href ||
    !isUsefulHref(raw.href)
  ) {
    return [];
  }

  const candidates: SelectorCandidate[] =
    [];

  const href =
    raw.href;

  // ----------------------------------------------------------
  // Exact href
  // ----------------------------------------------------------

  if (
    href.length <=
    MAX_ATTRIBUTE_LENGTH &&
    !looksGenerated(href)
  ) {
    candidates.push(
      createCandidate(
        `a[href="${escapeAttribute(
          href
        )}"]`,
        "href",
        "Exact link destination",
        78,
        96
      )
    );
  }

  const url =
    parseUrl(href);

  if (!url) {
    return candidates;
  }

  // ----------------------------------------------------------
  // Pathname
  // ----------------------------------------------------------

  const pathname =
    url.pathname;

  if (
    pathname &&
    pathname !== "/"
  ) {
    candidates.push(
      createCandidate(
        `a[href*="${escapeAttribute(
          pathname
        )}"]`,
        "href",
        "Stable pathname from link URL",
        88,
        94
      )
    );
  }

  // ----------------------------------------------------------
  // Pathname + final segment
  // ----------------------------------------------------------

  const pathParts =
    pathname
      .split("/")
      .filter(Boolean);

  const lastPath =
    pathParts[
    pathParts.length - 1
    ];

  if (
    lastPath &&
    lastPath.length >= 3 &&
    !looksGenerated(lastPath)
  ) {
    candidates.push(
      createCandidate(
        `a[href*="${escapeAttribute(
          lastPath
        )}"]`,
        "href",
        "Stable final pathname segment",
        76,
        86
      )
    );
  }

  // ----------------------------------------------------------
  // Stable query parameters
  // ----------------------------------------------------------

  const stableParams =
    Array.from(
      url.searchParams.entries()
    ).filter(
      ([name, value]) =>
        !isTrackingParameter(name) &&
        value.length > 0 &&
        !looksGenerated(value)
    );

  for (
    const [name, value] of stableParams.slice(
      0,
      3
    )
  ) {
    candidates.push(
      createCandidate(
        `a[href*="${escapeAttribute(
          `${name}=${value}`
        )}"]`,
        "href",
        `Stable URL parameter ${name}`,
        68,
        82
      )
    );
  }

  return candidates;
}

// ============================================================
// CLASS CANDIDATES
// ============================================================

function generateClassCandidates(
  raw: RawElement
): SelectorCandidate[] {
  const candidates: SelectorCandidate[] =
    [];

  const stableClasses =
    raw.classes.filter(
      (className) => {
        if (
          !className ||
          className.length > 80
        ) {
          return false;
        }

        if (
          looksGenerated(className)
        ) {
          return false;
        }

        if (
          /^(css|sc|jsx|emotion|ng-|wp-|elementor|vc_|swiper|slick)/i.test(
            className
          )
        ) {
          return false;
        }

        return true;
      }
    );

  for (
    const className of stableClasses.slice(
      0,
      5
    )
  ) {
    candidates.push(
      createCandidate(
        `${raw.tagName}.${escapeCss(
          className
        )}`,
        "class",
        `Stable class ${className}`,
        52,
        62
      )
    );
  }

  if (
    stableClasses.length >= 2
  ) {
    candidates.push(
      createCandidate(
        `${raw.tagName}.${escapeCss(
          stableClasses[0]
        )}.${escapeCss(
          stableClasses[1]
        )}`,
        "compound",
        "Two stable classes",
        58,
        76
      )
    );
  }

  return candidates;
}

// ============================================================
// TEXT CANDIDATES
// ============================================================

function generateTextCandidates(
  raw: RawElement
): SelectorCandidate[] {
  const text =
    clean(
      raw.text,
      100
    );

  if (
    !text ||
    text.length < 2 ||
    text.length > 100
  ) {
    return [];
  }

  if (
    raw.tagName !== "a" &&
    raw.tagName !== "button" &&
    raw.tagName !== "label" &&
    raw.tagName !== "summary"
  ) {
    return [];
  }

  const escaped =
    escapeSingleQuote(text);

  return [
    createCandidate(
      `${raw.tagName}:has-text("${escaped}")`,
      "text",
      "Visible interactive text",
      45,
      55
    ),
  ];
}

// ============================================================
// ANCESTOR CANDIDATES
// ============================================================

async function generateAncestorCandidates(
  handle: ElementHandleOfElement
): Promise<SelectorCandidate[]> {
  const values =
    await handle.evaluate(
      (
        element,
        config
      ) => {
        const result: Array<{
          selector: string;
          type: SelectorType;
          reason: string;
          depth: number;
          stability: number;
          specificity: number;
        }> = [];

        const cssEscape =
          (
            value: string
          ): string =>
            typeof CSS !==
              "undefined" &&
              typeof CSS.escape ===
              "function"
              ? CSS.escape(value)
              : value.replace(
                /[^a-zA-Z0-9_-]/g,
                (character) =>
                  `\\${character}`
              );

        const quote =
          (
            value: string
          ): string =>
            value
              .replace(
                /\\/g,
                "\\\\"
              )
              .replace(
                /"/g,
                '\\"'
              );

        let current:
          | Element
          | null =
          element.parentElement;

        let depth = 1;

        while (
          current &&
          depth <=
          config.maxDepth
        ) {
          const tag =
            current.tagName.toLowerCase();

          const id =
            current.getAttribute(
              "id"
            );

          if (
            id &&
            !/^(root|app|__next|main|container)$/i.test(
              id
            ) &&
            !/^[0-9]{6,}$/.test(
              id
            )
          ) {
            result.push({
              selector: `#${cssEscape(
                id
              )} ${element.tagName.toLowerCase()}`,
              type: "ancestor",
              reason:
                "Target constrained by stable ancestor id",
              depth,
              stability: 84,
              specificity: 90,
            });
          }

          const dataAttribute =
            Array.from(
              current.attributes
            ).find(
              (attribute) =>
                attribute.name
                  .toLowerCase()
                  .startsWith(
                    "data-"
                  ) &&
                /^(data-testid|data-test-id|data-test|data-cy|data-qa|data-automation|data-automation-id)$/i.test(
                  attribute.name
                ) &&
                attribute.value.length <=
                100
            );

          if (dataAttribute) {
            result.push({
              selector: `${tag}[${dataAttribute.name}="${quote(
                dataAttribute.value
              )}"] ${element.tagName.toLowerCase()}`,
              type: "ancestor",
              reason: `Target constrained by ancestor ${dataAttribute.name}`,
              depth,
              stability: 80,
              specificity: 86,
            });
          }

          if (
            /^(header|footer|nav|main|section|form)$/i.test(
              tag
            )
          ) {
            result.push({
              selector: `${tag} ${element.tagName.toLowerCase()}`,
              type: "ancestor",
              reason: `Target constrained to ${tag}`,
              depth,
              stability:
                tag ===
                  "header"
                  ? 74
                  : tag ===
                    "footer"
                    ? 72
                    : 62,
              specificity: 64,
            });
          }

          current =
            current.parentElement;

          depth += 1;
        }

        return result;
      },
      {
        maxDepth:
          MAX_ANCESTOR_DEPTH,
      }
    );

  return values.map(
    (value) =>
      createCandidate(
        value.selector,
        value.type,
        value.reason,
        value.stability,
        value.specificity,
        value.depth
      )
  );
}

// ============================================================
// STRUCTURAL CANDIDATES
// ============================================================

async function generateStructuralCandidates(
  handle: ElementHandleOfElement
): Promise<SelectorCandidate[]> {
  const values =
    await handle.evaluate(
      (element) => {
        const getIndex =
          (
            node: Element
          ): number => {
            const parent =
              node.parentElement;

            if (!parent) {
              return 1;
            }

            const sameTag =
              Array.from(
                parent.children
              ).filter(
                (child) =>
                  child.tagName ===
                  node.tagName
              );

            return (
              sameTag.indexOf(
                node
              ) + 1
            );
          };

        const getPart =
          (
            node: Element
          ): string => {
            const tag =
              node.tagName.toLowerCase();

            const id =
              node.getAttribute(
                "id"
              );

            const testId =
              node.getAttribute(
                "data-testid"
              );

            const aria =
              node.getAttribute(
                "aria-label"
              );

            const href =
              node.getAttribute(
                "href"
              );

            if (
              id &&
              !/^(root|app|__next|main|container)$/i.test(
                id
              ) &&
              !/^[0-9]{6,}$/.test(
                id
              ) &&
              id.length <=
              80
            ) {
              return `#${id.replace(
                /[^a-zA-Z0-9_-]/g,
                (character) =>
                  `\\${character}`
              )}`;
            }

            if (
              testId &&
              testId.length <=
              100
            ) {
              return `${tag}[data-testid="${testId.replace(
                /"/g,
                '\\"'
              )}"]`;
            }

            if (
              aria &&
              aria.length <=
              100
            ) {
              return `${tag}[aria-label="${aria.replace(
                /"/g,
                '\\"'
              )}"]`;
            }

            if (
              tag ===
              "a" &&
              href
            ) {
              try {
                const url =
                  new URL(
                    href,
                    "https://selector.local"
                  );

                if (
                  url.pathname &&
                  url.pathname !==
                  "/"
                ) {
                  return `a[href*="${url.pathname.replace(
                    /"/g,
                    '\\"'
                  )}"]`;
                }
              } catch {
                // Ignore invalid URLs.
              }
            }

            const index =
              getIndex(node);

            return index > 1
              ? `${tag}:nth-of-type(${index})`
              : tag;
          };

        const result: Array<{
          selector: string;
          depth: number;
        }> = [];

        const parts: string[] =
          [];

        let current:
          | Element
          | null =
          element;

        for (
          let depth = 1;
          current &&
          depth <= 7;
          depth += 1
        ) {
          parts.unshift(
            getPart(
              current
            )
          );

          result.push({
            selector:
              parts.join(
                " > "
              ),
            depth,
          });

          current =
            current.parentElement;
        }

        return result;
      }
    );

  return values.map(
    (value) =>
      createCandidate(
        value.selector,
        "path",
        "DOM structural fallback",
        38,
        70,
        value.depth
      )
  );
}

// ============================================================
// GENERATE SELECTOR CANDIDATES
// ============================================================

export async function generateSelectorCandidates(
  page: Page,
  handle: ElementHandleOfElement,
  inspected?: InspectedElement
): Promise<SelectorCandidate[]> {
  void page;
  void inspected;

  const raw =
    await extractRawElement(
      handle
    );

  if (!raw) {
    return [];
  }

  const candidates: SelectorCandidate[] =
    [
      ...generateBasicCandidates(
        raw
      ),

      ...generateHrefCandidates(
        raw
      ),

      ...generateClassCandidates(
        raw
      ),

      ...generateTextCandidates(
        raw
      ),

      ...(await generateAncestorCandidates(
        handle
      )),

      ...(await generateStructuralCandidates(
        handle
      )),
    ];

  const unique =
    new Map<
      string,
      SelectorCandidate
    >();

  for (
    const item of candidates
  ) {
    if (
      !item.selector
    ) {
      continue;
    }

    const existing =
      unique.get(
        item.selector
      );

    if (
      !existing ||
      item.specificityScore >
      existing.specificityScore
    ) {
      unique.set(
        item.selector,
        item
      );
    }
  }

  return Array.from(
    unique.values()
  ).slice(
    0,
    MAX_CANDIDATES
  );
}

// ============================================================
// VALIDATE ONE SELECTOR
// ============================================================

async function validateOne(
  page: Page,
  handle: ElementHandleOfElement,
  item: SelectorCandidate
): Promise<SelectorCandidate> {
  void page;

  const result =
    await handle.evaluate(
      (
        element,
        selector
      ) => {
        try {
          const matches =
            Array.from(
              document.querySelectorAll(
                selector
              )
            );

          return {
            matchCount:
              matches.length,

            targetMatched:
              matches.includes(
                element
              ),
          };
        } catch {
          return {
            matchCount: 0,
            targetMatched: false,
          };
        }
      },
      item.selector
    );

  let uniquenessScore = 0;

  if (
    result.targetMatched
  ) {
    if (
      result.matchCount ===
      1
    ) {
      uniquenessScore =
        100;
    } else if (
      result.matchCount >
      1
    ) {
      uniquenessScore =
        Math.max(
          5,
          100 -
          (
            result.matchCount -
            1
          ) *
          10
        );
    }
  }

  const score =
    item.stabilityScore *
    0.30 +
    item.specificityScore *
    0.25 +
    uniquenessScore *
    0.45;

  return {
    ...item,

    matchCount:
      result.matchCount,

    targetMatched:
      result.targetMatched,

    score,
  };
}

// ============================================================
// VALIDATE SELECTOR
// ============================================================

export async function validateSelector(
  page: Page,
  handle: ElementHandleOfElement,
  item: SelectorCandidate
): Promise<SelectorCandidate> {
  return validateOne(
    page,
    handle,
    item
  );
}

// ============================================================
// VALIDATE ALL
// ============================================================

export async function validateSelectorCandidates(
  page: Page,
  handle: ElementHandleOfElement,
  candidates: SelectorCandidate[]
): Promise<SelectorCandidate[]> {
  const results: SelectorCandidate[] =
    [];

  for (
    const candidateItem of candidates
  ) {
    try {
      results.push(
        await validateOne(
          page,
          handle,
          candidateItem
        )
      );
    } catch {
      // Ignore invalid candidate.
    }
  }

  return results.sort(
    (
      first,
      second
    ) => {
      const firstUnique =
        first.targetMatched &&
        first.matchCount ===
        1;

      const secondUnique =
        second.targetMatched &&
        second.matchCount ===
        1;

      if (
        firstUnique !==
        secondUnique
      ) {
        return firstUnique
          ? -1
          : 1;
      }

      if (
        second.score !==
        first.score
      ) {
        return (
          second.score -
          first.score
        );
      }

      if (
        second.stabilityScore !==
        first.stabilityScore
      ) {
        return (
          second.stabilityScore -
          first.stabilityScore
        );
      }

      if (
        second.specificityScore !==
        first.specificityScore
      ) {
        return (
          second.specificityScore -
          first.specificityScore
        );
      }

      return (
        first.selector.length -
        second.selector.length
      );
    }
  );
}

// ============================================================
// BEST SELECTOR
// ============================================================

export function getBestSelector(
  candidates: SelectorCandidate[]
): SelectorCandidate | null {
  const valid =
    candidates.filter(
      (item) =>
        item.targetMatched &&
        item.matchCount >
        0
    );

  if (
    valid.length ===
    0
  ) {
    return null;
  }

  const unique =
    valid.filter(
      (item) =>
        item.matchCount ===
        1
    );

  const pool =
    unique.length > 0
      ? unique
      : valid;

  return [...pool].sort(
    (
      first,
      second
    ) => {
      if (
        second.score !==
        first.score
      ) {
        return (
          second.score -
          first.score
        );
      }

      if (
        second.stabilityScore !==
        first.stabilityScore
      ) {
        return (
          second.stabilityScore -
          first.stabilityScore
        );
      }

      if (
        second.specificityScore !==
        first.specificityScore
      ) {
        return (
          second.specificityScore -
          first.specificityScore
        );
      }

      return (
        first.selector.length -
        second.selector.length
      );
    }
  )[0] ?? null;
}

// ============================================================
// INTERACTION EXPRESSION
// ============================================================

export function buildInteractionExpression(
  selector: string,
  selectorType?: SelectorType,
  closestTag?: string
): string {
  void selectorType;
  void closestTag;

  return `e.target.closest('${escapeSingleQuote(
    selector
  )}')`;
}

// ============================================================
// INTERACTION ALIAS
// ============================================================

export function createInteractionExpression(
  selector: string,
  selectorType?: SelectorType,
  closestTag?: string
): string {
  return buildInteractionExpression(
    selector,
    selectorType,
    closestTag
  );
}

// ============================================================
// QUERY SELECTOR EXPRESSION
// ============================================================

export function buildQuerySelectorExpression(
  selector: string
): string {
  return `document.querySelector('${escapeSingleQuote(
    selector
  )}')`;
}

// ============================================================
// INSPECT ONE ELEMENT
// ============================================================

export async function inspectElement(
  page: Page,
  handle: ElementHandleOfElement
): Promise<InspectedElement | null> {
  const target =
    await resolveInteractiveElement(
      handle
    );

  const raw =
    await extractRawElement(
      target
    );

  if (!raw) {
    return null;
  }

  if (!raw.visible) {
    return null;
  }

  const inspected =
    rawToInspected(
      raw
    );

  const candidates =
    await generateSelectorCandidates(
      page,
      target,
      inspected
    );

  const validated =
    await validateSelectorCandidates(
      page,
      target,
      candidates
    );

  inspected.candidates =
    validated;

  inspected.selectorSource =
    "website-inspection";

  const best =
    getBestSelector(
      validated
    );

  // ----------------------------------------------------------
  // IMPORTANT
  //
  // We no longer throw away a valid non-unique selector.
  // The selector is still displayed to the user.
  // selectorUnique tells the UI whether it is unique.
  // ----------------------------------------------------------

  if (!best) {
    inspected.selectorUnique =
      false;

    inspected.matchCount =
      0;

    inspected.confidence =
      0;

    return inspected;
  }

  inspected.selector =
    best.selector;

  inspected.selectorType =
    best.selectorType;

  inspected.matchCount =
    best.matchCount;

  inspected.selectorUnique =
    best.matchCount ===
    1;

  inspected.confidence =
    Math.max(
      0,
      Math.min(
        100,
        Math.round(
          best.score
        )
      )
    );

  inspected.interactionExpression =
    buildInteractionExpression(
      best.selector,
      best.selectorType,
      raw.interactiveTag
    );

  inspected.querySelectorExpression =
    buildQuerySelectorExpression(
      best.selector
    );

  inspected.closestTag =
    raw.interactiveTag;

  inspected.closestId =
    raw.id;

  inspected.closestClasses =
    raw.classes;

  inspected.parentTagName =
    raw.ancestorTags[0];

  inspected.parentId =
    raw.ancestorIds[0];

  inspected.parentClasses =
    raw.ancestorClasses;

  inspected.regionTag =
    raw.sectionTag;

  inspected.regionDepth =
    raw.sectionTag
      ? raw.ancestorTags.indexOf(
        raw.sectionTag
      ) + 1
      : undefined;

  return inspected;
}

// ============================================================
// COLLECT INTERACTIVE ELEMENTS
// ============================================================

export async function collectInteractiveElements(
  page: Page
): Promise<ElementHandleOfElement[]> {
  const handles =
    await page
      .locator(
        INTERACTIVE_SELECTOR
      )
      .elementHandles();

  const result: ElementHandleOfElement[] =
    [];

  const seen =
    new Set<string>();

  for (
    const handle of handles as ElementHandleOfElement[]
  ) {
    if (
      result.length >=
      MAX_ELEMENTS
    ) {
      break;
    }

    try {
      const key =
        await handle.evaluate(
          (element) => {
            const rect =
              element.getBoundingClientRect();

            return [
              element.tagName,

              element.getAttribute(
                "id"
              ) ?? "",

              element.getAttribute(
                "href"
              ) ?? "",

              element.getAttribute(
                "aria-label"
              ) ?? "",

              element.textContent
                ?.replace(
                  /\s+/g,
                  " "
                )
                .trim()
                .slice(
                  0,
                  100
                ) ?? "",

              Math.round(
                rect.x
              ),

              Math.round(
                rect.y
              ),

              Math.round(
                rect.width
              ),

              Math.round(
                rect.height
              ),
            ].join("|");
          }
        );

      if (
        seen.has(key)
      ) {
        continue;
      }

      seen.add(key);

      result.push(
        handle
      );
    } catch {
      // Ignore detached element.
    }
  }

  return result;
}

// ============================================================
// INSPECT PAGE
// ============================================================

export async function inspectPage(
  page: Page
): Promise<InspectedElement[]> {
  const handles =
    await collectInteractiveElements(
      page
    );

  const results: InspectedElement[] =
    [];

  for (
    const handle of handles
  ) {
    if (
      results.length >=
      MAX_ELEMENTS
    ) {
      break;
    }

    try {
      const inspected =
        await inspectElement(
          page,
          handle
        );

      if (
        inspected
      ) {
        results.push(
          inspected
        );
      }
    } catch {
      // Ignore detached/invalid nodes.
    }
  }

  return results;
}

// ============================================================
// STRING VALUES
// ============================================================

function stringValues(
  value: unknown
): string[] {
  if (
    typeof value ===
    "string"
  ) {
    return [
      value,
    ];
  }

  if (
    Array.isArray(value)
  ) {
    return value.flatMap(
      stringValues
    );
  }

  if (
    value &&
    typeof value ===
    "object"
  ) {
    return Object.values(
      value as Record<
        string,
        unknown
      >
    ).flatMap(
      stringValues
    );
  }

  return [];
}

// ============================================================
// EVENT FIELD
// ============================================================

function eventField(
  event: EventSchemaRow,
  names: string[]
): string[] {
  const source =
    event as Record<
      string,
      unknown
    >;

  const values: string[] =
    [];

  for (
    const name of names
  ) {
    values.push(
      ...stringValues(
        source[name]
      )
    );
  }

  return values.filter(
    Boolean
  );
}

// ============================================================
// PARSE GTM DIMENSIONS
// ============================================================

function parseDimensionString(
  value: unknown
): Record<string, string> {
  const result: Record<
    string,
    string
  > = {};

  if (
    typeof value !==
    "string"
  ) {
    return result;
  }

  for (
    const line of value.split(
      /\r?\n/
    )
  ) {
    const match =
      line.match(
        /\{\{\s*([^}]+?)\s*\}\}\s*:?\s*(.*)$/
      );

    if (!match) {
      continue;
    }

    const key =
      match[1].trim();

    const content =
      match[2].trim();

    if (content) {
      result[key] =
        content;
    }
  }

  return result;
}

// ============================================================
// EVENT SIGNALS
// ============================================================

function buildEventSignals(
  event: EventSchemaRow
): EventSignals {
  const source =
    event as Record<
      string,
      unknown
    >;

  const dimensionText =
    [
      source.customDimensions,
      source.customDimension,
      source.dimensions,
      source.parameters,
      source.customParameters,
    ]
      .flatMap(
        stringValues
      )
      .join("\n");

  const parsed =
    parseDimensionString(
      dimensionText
    );

  const scenario =
    eventField(
      event,
      [
        "scenario",
        "description",
        "eventDescription",
        "condition",
        "interaction",
      ]
    ).join(" ");

  const action =
    [
      ...eventField(
        event,
        [
          "eventAction",
          "action",
          "buttonText",
          "linkText",
        ]
      ),
      ...eventField(
        event,
        [
          "subMenuItem",
        ]
      ),
      parsed.eventAction ??
      "",
      parsed.buttonText ??
      "",
    ].join(" ");

  const section =
    [
      ...eventField(
        event,
        [
          "sectionHeading",
          "section",
          "sectionName",
          "heading",
        ]
      ),
      parsed.sectionHeading ??
      "",
    ].join(" ");

  const category =
    [
      ...eventField(
        event,
        [
          "eventCategory",
          "category",
          "eventSubCategory",
          "subMenuName",
        ]
      ),
      parsed.eventCategory ??
      "",
      parsed.eventSubCategory ??
      "",
    ].join(" ");

  const url =
    [
      ...eventField(
        event,
        [
          "pageUrl",
          "url",
          "page",
          "href",
          "clickUrl",
        ]
      ),
      parsed.eventLabel ??
      "",
    ].join(" ");

  const menu =
    eventField(
      event,
      [
        "menuName",
        "subMenuName",
        "subMenuItem",
      ]
    ).join(" ");

  const pageName =
    eventField(
      event,
      [
        "pageName",
        "pageTitle",
        "pageNameValue",
      ]
    ).join(" ");

  const all =
    [
      event.eventName,
      event.eventCategory,
      event.eventAction,
      event.eventLabel,
      event.pageUrl,
      event.clickUrl,
      event.buttonText,
      event.sectionHeading,
      event.menuName,
      event.subMenuName,
      event.subMenuItem,
      scenario,
      action,
      section,
      category,
      url,
      menu,
      pageName,
      ...Object.values(
        source
      ).flatMap(
        stringValues
      ),
    ].join(" ");

  return {
    allText:
      normalize(all),

    explicitTerms:
      words(
        action +
        " " +
        section +
        " " +
        category +
        " " +
        menu
      ),

    actionTerms:
      words(action),

    sectionTerms:
      words(section),

    categoryTerms:
      words(category),

    urlTerms:
      words(url),

    scenarioTerms:
      words(scenario),

    pageTerms:
      words(
        pageName +
        " " +
        event.pageUrl
      ),

    eventNameTerms:
      words(
        event.eventName
      ),

    menuTerms:
      words(menu),
  };
}

// ============================================================
// ELEMENT SEMANTIC TEXT
// ============================================================

function elementSemanticText(
  element: InspectedElement
): string {
  const source =
    element as InspectedElement &
    Record<string, unknown>;

  const values: string[] =
    [
      element.text ?? "",
      element.alt ?? "",
      element.title ?? "",
      element.ariaLabel ?? "",
      element.name ?? "",
      element.href ?? "",
      element.role ?? "",
      element.type ?? "",
      element.id ?? "",
      ...(element.classes ??
        []),

      ...Object.values(
        element.dataAttributes ??
        {}
      ),

      ...Object.keys(
        element.dataAttributes ??
        {}
      ),
    ];

  for (
    const key of [
      "sectionHeading",
      "ancestorText",
      "ancestorTags",
      "ancestorIds",
      "ancestorClasses",
      "closestTag",
      "descendantImageAlt",
      "regionTag",
    ]
  ) {
    values.push(
      ...stringValues(
        source[key]
      )
    );
  }

  return normalize(
    values.join(" ")
  );
}

// ============================================================
// TOKEN OVERLAP
// ============================================================

function tokenOverlap(
  first: string[],
  second: string[]
): number {
  if (
    first.length === 0 ||
    second.length === 0
  ) {
    return 0;
  }

  const secondSet =
    new Set(second);

  const hits =
    first.filter(
      (token) =>
        secondSet.has(token)
    );

  return (
    hits.length /
    Math.max(
      1,
      Math.min(
        first.length,
        second.length
      )
    )
  );
}

// ============================================================
// EXACT PHRASE SCORE
// ============================================================

function exactPhraseScore(
  event: EventSignals,
  element: InspectedElement
): number {
  const semantic =
    elementSemanticText(
      element
    );

  if (!semantic) {
    return 0;
  }

  let best = 0;

  const phrases =
    event.explicitTerms;

  for (
    const phrase of phrases
  ) {
    const normalized =
      normalize(phrase);

    if (
      normalized.length <
      3
    ) {
      continue;
    }

    if (
      semantic.includes(
        normalized
      )
    ) {
      best =
        Math.max(
          best,
          Math.min(
            1,
            normalized.split(
              " "
            ).length / 4
          )
        );
    }
  }

  return best;
}

// ============================================================
// SPECIAL EVENT NAME
// ============================================================

function normalizedEventName(
  event: EventSchemaRow
): string {
  return normalize(
    event.eventName
  ).replace(
    /\s+/g,
    "_"
  );
}

// ============================================================
// EVENT -> ELEMENT SCORE
// ============================================================

function scoreEventElement(
  event: EventSchemaRow,
  element: InspectedElement
): number {
  const signals =
    buildEventSignals(
      event
    );

  const semantic =
    elementSemanticText(
      element
    );

  const elementWords =
    words(
      semantic
    );

  let score = 0;

  // ----------------------------------------------------------
  // Generic semantic scoring
  // ----------------------------------------------------------

  score +=
    tokenOverlap(
      signals.actionTerms,
      elementWords
    ) * 42;

  score +=
    tokenOverlap(
      signals.sectionTerms,
      elementWords
    ) * 24;

  score +=
    tokenOverlap(
      signals.categoryTerms,
      elementWords
    ) * 14;

  score +=
    tokenOverlap(
      signals.scenarioTerms,
      elementWords
    ) * 30;

  score +=
    tokenOverlap(
      signals.eventNameTerms,
      elementWords
    ) * 8;

  score +=
    tokenOverlap(
      signals.menuTerms,
      elementWords
    ) * 35;

  score +=
    tokenOverlap(
      words(
        signals.allText
      ),
      elementWords
    ) * 8;

  score +=
    tokenOverlap(
      signals.urlTerms,
      elementWords
    ) * 12;

  score +=
    exactPhraseScore(
      signals,
      element
    ) * 30;

  // ----------------------------------------------------------
  // Region scoring
  // ----------------------------------------------------------

  const category =
    normalize(
      event.eventCategory
    );

  const eventName =
    normalizedEventName(
      event
    );

  if (
    category.includes(
      "header"
    ) &&
    element.regionTag ===
    "header"
  ) {
    score += 55;
  }

  if (
    category.includes(
      "footer"
    ) &&
    element.regionTag ===
    "footer"
  ) {
    score += 55;
  }

  if (
    eventName.includes(
      "header"
    ) &&
    element.regionTag ===
    "header"
  ) {
    score += 40;
  }

  if (
    eventName.includes(
      "footer"
    ) &&
    element.regionTag ===
    "footer"
  ) {
    score += 40;
  }

  // ----------------------------------------------------------
  // Logo click
  // ----------------------------------------------------------

  if (
    eventName ===
    "logo_click" ||
    eventName.includes(
      "logo"
    )
  ) {
    const logoText =
      normalize(
        [
          element.alt,
          element.ariaLabel,
          element.title,
          element.text,
        ].join(" ")
      );

    if (
      logoText.includes(
        "logo"
      )
    ) {
      score += 70;
    }

    if (
      logoText.includes(
        "analyticsliv"
      )
    ) {
      score += 65;
    }

    if (
      element.tagName ===
      "a" &&
      (
        element.href ===
        "/" ||
        element.href?.endsWith(
          "analyticsliv.com/"
        )
      )
    ) {
      score += 85;
    }

    if (
      element.regionTag ===
      "header"
    ) {
      score += 35;
    }
  }

  // ----------------------------------------------------------
  // Header click
  // ----------------------------------------------------------

  if (
    eventName ===
    "header_click"
  ) {
    if (
      element.regionTag ===
      "header"
    ) {
      score += 60;
    }

    if (
      element.tagName ===
      "a" ||
      element.tagName ===
      "button"
    ) {
      score += 15;
    }
  }

  // ----------------------------------------------------------
  // Footer click
  // ----------------------------------------------------------

  if (
    eventName ===
    "footer_click"
  ) {
    if (
      element.regionTag ===
      "footer"
    ) {
      score += 60;
    }
  }

  // ----------------------------------------------------------
  // Phone
  // ----------------------------------------------------------

  if (
    eventName.includes(
      "phone"
    ) &&
    /^tel:/i.test(
      element.href ??
      ""
    )
  ) {
    score += 100;
  }

  // ----------------------------------------------------------
  // Email
  // ----------------------------------------------------------

  if (
    eventName.includes(
      "email"
    ) &&
    /^mailto:/i.test(
      element.href ??
      ""
    )
  ) {
    score += 100;
  }

  // ----------------------------------------------------------
  // Policy
  // ----------------------------------------------------------

  if (
    eventName.includes(
      "policy"
    )
  ) {
    if (
      /privacy|terms|refund/i.test(
        [
          element.text,
          element.href,
          element.ariaLabel,
        ].join(" ")
      )
    ) {
      score += 80;
    }
  }

  // ----------------------------------------------------------
  // Social media
  // ----------------------------------------------------------

  if (
    eventName.includes(
      "social"
    )
  ) {
    if (
      /linkedin|facebook|instagram|youtube|twitter|x\.com/i.test(
        [
          element.href,
          element.ariaLabel,
          element.title,
          element.text,
        ].join(" ")
      )
    ) {
      score += 90;
    }
  }

  // ----------------------------------------------------------
  // Partner logo
  // ----------------------------------------------------------

  if (
    eventName.includes(
      "partner"
    )
  ) {
    if (
      element.tagName ===
      "a" &&
      /partner|google|gmp|facebook|meta/i.test(
        [
          element.text,
          element.alt,
          element.href,
          element.ariaLabel,
        ].join(" ")
      )
    ) {
      score += 90;
    }

    if (
      element.alt &&
      /partner/i.test(
        element.alt
      )
    ) {
      score += 60;
    }
  }

  // ----------------------------------------------------------
  // Exact click URL matching
  // ----------------------------------------------------------

  if (
    event.clickUrl &&
    element.href
  ) {
    const eventPath =
      getUrlPathname(
        event.clickUrl
      );

    const elementPath =
      getUrlPathname(
        element.href
      );

    if (
      eventPath &&
      elementPath &&
      eventPath ===
      elementPath
    ) {
      score += 100;
    } else if (
      eventPath &&
      elementPath &&
      elementPath.includes(
        eventPath
      )
    ) {
      score += 70;
    }
  }

  return score;
}

// ============================================================
// SPECIAL DIRECT MATCH
// ============================================================

function directEventMatch(
  event: EventSchemaRow,
  element: InspectedElement
): boolean {
  const eventName =
    normalizedEventName(
      event
    );

  const action =
    normalize(
      event.eventAction
    );

  const buttonText =
    normalize(
      event.buttonText
    );

  const menuName =
    normalize(
      event.menuName
    );

  const subMenuName =
    normalize(
      event.subMenuName
    );

  const subMenuItem =
    normalize(
      event.subMenuItem
    );

  const elementText =
    normalize(
      [
        element.text,
        element.alt,
        element.title,
        element.ariaLabel,
        element.name,
      ].join(" ")
    );

  // ----------------------------------------------------------
  // Logo
  // ----------------------------------------------------------

  if (
    eventName ===
    "logo_click"
  ) {
    if (
      element.tagName ===
      "a" &&
      (
        element.href ===
        "/" ||
        element.href?.endsWith(
          "analyticsliv.com/"
        )
      )
    ) {
      return true;
    }

    if (
      /logo|analyticsliv/i.test(
        elementText
      )
    ) {
      return true;
    }
  }

  // ----------------------------------------------------------
  // Exact button text
  // ----------------------------------------------------------

  if (
    buttonText &&
    elementText.includes(
      buttonText
    )
  ) {
    return true;
  }

  // ----------------------------------------------------------
  // Exact action
  // ----------------------------------------------------------

  if (
    action &&
    elementText.includes(
      action
    )
  ) {
    return true;
  }

  // ----------------------------------------------------------
  // Menu
  // ----------------------------------------------------------

  if (
    menuName &&
    elementText.includes(
      menuName
    )
  ) {
    return true;
  }

  if (
    subMenuName &&
    elementText.includes(
      subMenuName
    )
  ) {
    return true;
  }

  if (
    subMenuItem &&
    elementText.includes(
      subMenuItem
    )
  ) {
    return true;
  }

  return false;
}

// ============================================================
// NO RESOLVED EVENT
// ============================================================

function noResolvedEvent(
  event: EventSchemaRow
): WebsiteResolvedEvent {
  return {
    ...event,

    selector:
      undefined,

    selectorType:
      undefined,

    selectorSource:
      "website-inspection",

    interactionExpression:
      undefined,

    querySelectorExpression:
      undefined,

    matchCount:
      0,

    selectorUnique:
      false,

    candidates:
      [],
  };
}

// ============================================================
// RESOLVE ELEMENT FOR EVENT
// ============================================================

export function resolveElementForEvent(
  event: EventSchemaRow,
  elements: InspectedElement[]
): InspectedElement | null {
  if (
    elements.length ===
    0
  ) {
    return null;
  }

  const directMatches =
    elements.filter(
      (element) =>
        directEventMatch(
          event,
          element
        )
    );

  const searchPool =
    directMatches.length >
      0
      ? directMatches
      : elements;

  const scored =
    searchPool
      .map(
        (element) => ({
          element,
          score:
            scoreEventElement(
              event,
              element
            ),
        })
      )
      .sort(
        (
          first,
          second
        ) =>
          second.score -
          first.score
      );

  const best =
    scored[0];

  if (!best) {
    return null;
  }

  const second =
    scored[1];

  const eventName =
    normalizedEventName(
      event
    );

  // ----------------------------------------------------------
  // Threshold
  // ----------------------------------------------------------

  let threshold =
    10;

  if (
    eventName ===
    "logo_click"
  ) {
    threshold = 20;
  }

  if (
    eventName ===
    "header_click"
  ) {
    threshold = 8;
  }

  if (
    eventName ===
    "footer_click"
  ) {
    threshold = 8;
  }

  // ----------------------------------------------------------
  // Do NOT reject merely because another element has a
  // similar score.
  //
  // The selector itself is validated separately.
  // ----------------------------------------------------------

  if (
    best.score <
    threshold
  ) {
    return null;
  }

  // ----------------------------------------------------------
  // Prefer unique selector candidate if available
  // ----------------------------------------------------------

  if (
    best.element.selectorUnique
  ) {
    return best.element;
  }

  // ----------------------------------------------------------
  // If best is not unique but has a strong semantic lead,
  // still return it so UI can display the selector.
  // ----------------------------------------------------------

  if (
    second &&
    best.score -
    second.score <
    2
  ) {
    const uniqueAlternative =
      scored.find(
        (item) =>
          item.element
            .selectorUnique
      );

    if (
      uniqueAlternative
    ) {
      return uniqueAlternative.element;
    }
  }

  return best.element;
}

// ============================================================
// RESOLVE EVENT SELECTORS
// ============================================================

export async function resolveEventSelectors(
  events: EventSchemaRow[],
  elements: InspectedElement[]
): Promise<WebsiteResolvedEvent[]> {
  return events.map(
    (event) => {
      const selected =
        resolveElementForEvent(
          event,
          elements
        );

      // --------------------------------------------------------
      // IMPORTANT:
      //
      // Previously the event was completely rejected when
      // selectorUnique was false.
      //
      // Now a valid selector is returned even when it matches
      // multiple elements. selectorUnique remains false.
      // --------------------------------------------------------

      if (
        !selected ||
        !selected.selector
      ) {
        return noResolvedEvent(
          event
        );
      }

      return {
        ...event,

        selector:
          selected.selector,

        selectorType:
          selected.selectorType,

        selectorSource:
          "website-inspection",

        interactionExpression:
          selected.interactionExpression,

        querySelectorExpression:
          selected.querySelectorExpression,

        closestTag:
          selected.closestTag,

        element:
          selected.tagName,

        matchCount:
          selected.matchCount,

        selectorUnique:
          selected.selectorUnique ===
          true,

        confidence:
          selected.confidence,

        candidates:
          selected.candidates,
      };
    }
  );
}

// ============================================================
// INSPECT WEBSITE
// ============================================================

export async function inspectWebsite(
  page: Page,
  events: EventSchemaRow[] = []
): Promise<{
  elements: InspectedElement[];
  events: WebsiteResolvedEvent[];
  pagesVisited: string[];
}> {
  const elements =
    await inspectPage(
      page
    );

  const resolvedEvents =
    await resolveEventSelectors(
      events,
      elements
    );

  return {
    elements,
    events:
      resolvedEvents,
    pagesVisited:
      [page.url()],
  };
}

// ============================================================
// ALIAS
// ============================================================

export const inspectWebsiteDOM =
  inspectWebsite;

// ============================================================
// SIMPLE API
// ============================================================

export async function generateBestSelector(
  page: Page,
  handle: ElementHandleOfElement
): Promise<SelectorCandidate | null> {
  const inspected =
    await inspectElement(
      page,
      handle
    );

  if (
    !inspected?.candidates
  ) {
    return null;
  }

  return getBestSelector(
    inspected.candidates
  );
}

// ============================================================
// FIND BEST INTERACTIVE TARGET
// ============================================================

export async function findBestInteractiveTarget(
  handle: ElementHandleOfElement
): Promise<ElementHandleOfElement> {
  return resolveInteractiveElement(
    handle
  );
}

// ============================================================
// EXISTING ROUTE ALIASES
// ============================================================

export const inspectDOM =
  inspectPage;

export const inspectDOMElement =
  inspectElement;

export const generateDynamicSelectors =
  generateSelectorCandidates;

export const resolveSelectorsForEvents =
  resolveEventSelectors;