const PRINT_STYLES = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    color: #0f172a;
    background: #fff;
    padding: 24px;
    font-size: 13px;
    line-height: 1.45;
  }
  @page { margin: 16mm; }
  @media print {
    body { padding: 0; }
    .no-print { display: none !important; }
  }
`;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildPrintDocument(bodyContent: string, title: string) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title><style>${PRINT_STYLES}</style></head><body>${bodyContent}</body></html>`;
}

async function waitForImages(container: ParentNode) {
  const images = Array.from(container.querySelectorAll('img'));
  if (images.length === 0) return;
  await Promise.all(
    images.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete) {
            resolve();
            return;
          }
          img.onload = () => resolve();
          img.onerror = () => resolve();
        }),
    ),
  );
}

function triggerPrint(target: Window, onDone: () => void) {
  const cleanup = () => {
    onDone();
  };

  target.addEventListener('afterprint', cleanup, { once: true });
  target.focus();
  target.print();
  // Some browsers never fire afterprint — still clean up eventually.
  window.setTimeout(cleanup, 30_000);
}

/** Print pre-rendered HTML without opening a pop-up window. */
export function printHtml(bodyContent: string, title: string) {
  const html = buildPrintDocument(bodyContent, title);

  // Prefer a hidden iframe — works even when pop-ups are blocked.
  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', title);
  iframe.setAttribute('aria-hidden', 'true');
  Object.assign(iframe.style, {
    position: 'fixed',
    width: '0',
    height: '0',
    border: '0',
    opacity: '0',
    pointerEvents: 'none',
    right: '0',
    bottom: '0',
  });

  const removeIframe = () => {
    iframe.remove();
  };

  iframe.onload = () => {
    const frameWindow = iframe.contentWindow;
    const frameDoc = iframe.contentDocument ?? frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      removeIframe();
      printHtmlInPage(bodyContent, title);
      return;
    }

    void waitForImages(frameDoc.body).then(() => {
      triggerPrint(frameWindow, removeIframe);
    });
  };

  document.body.appendChild(iframe);
  iframe.srcdoc = html;
}

/** Fallback: inject print content into the current page. */
function printHtmlInPage(bodyContent: string, title: string) {
  const previousTitle = document.title;
  const root = document.createElement('div');
  root.id = 'chms-print-root';
  root.innerHTML = bodyContent;

  const style = document.createElement('style');
  style.id = 'chms-print-style';
  style.textContent = `
    @media print {
      body > *:not(#chms-print-root) { display: none !important; }
      #chms-print-root {
        display: block !important;
        position: static !important;
        width: 100% !important;
        padding: 24px !important;
      }
    }
    @media screen {
      #chms-print-root {
        position: fixed;
        left: -10000px;
        top: 0;
        width: 820px;
        opacity: 0;
        pointer-events: none;
      }
    }
    ${PRINT_STYLES}
  `;

  const cleanup = () => {
    root.remove();
    style.remove();
    document.title = previousTitle;
  };

  document.head.appendChild(style);
  document.body.appendChild(root);
  document.title = title;

  void waitForImages(root).then(() => {
    triggerPrint(window, cleanup);
  });
}
