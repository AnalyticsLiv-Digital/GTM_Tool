import type {
  EventSchemaRow,
} from "@/lib/event-automation/types";

import {
  generateDataLayerCode,
} from "./datalayer-generator";


// =====================================================
// ESCAPE HTML SCRIPT
// =====================================================

function escapeScript(
  value: string
): string {
  return value.replace(
    /<\/script/gi,
    "<\\/script"
  );
}


// =====================================================
// GENERATE EVENT BLOCK
// =====================================================

function generateEventBlock(
  row: EventSchemaRow
): string {
  if (!row.selector) {
    return "";
  }

  const selector =
    JSON.stringify(
      row.selector
    );

  const dataLayerCode =
    generateDataLayerCode(
      row
    );

  return `
  if (
    e.target.closest(${selector})
  ) {
${dataLayerCode
  .split("\n")
  .map(
    (line) => `    ${line}`
  )
  .join("\n")}
  }`;
}


// =====================================================
// GENERATE CUSTOM HTML TAG
// =====================================================

export function generateCustomHtmlTag(
  rows: EventSchemaRow[]
): string {
  const blocks =
    rows
      .map(
        generateEventBlock
      )
      .filter(Boolean)
      .join("\n");

  return escapeScript(`
<script>
(function () {

  if (window.__GTM_EVENT_AUTOMATION__) {
    return;
  }

  window.__GTM_EVENT_AUTOMATION__ = true;

  document.addEventListener(
    "click",
    function (e) {

      if (!e.target) {
        return;
      }

${blocks}

    },
    true
  );

})();
</script>
`);
}


// =====================================================
// COMMON TAG
// =====================================================

export function generateCommonEventTag(
  rows: EventSchemaRow[]
): string {
  return generateCustomHtmlTag(
    rows
  );
}


// =====================================================
// UNIQUE TAG
// =====================================================

export function generateUniqueEventTag(
  rows: EventSchemaRow[]
): string {
  return generateCustomHtmlTag(
    rows
  );
}