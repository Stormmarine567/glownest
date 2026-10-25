import { escapeHtml } from '@/lib/utils';

export const NAVY = '#1B2A4A';

export function button(href: string, label: string) {
  return `<a href="${escapeHtml(href)}" style="display:inline-block;background:${NAVY};color:#ffffff;text-decoration:none;padding:13px 28px;border-radius:999px;font-weight:700;font-size:14px">${escapeHtml(label)}</a>`;
}

/** Branded, table-based layout that renders in Outlook/Gmail. All dynamic values must already be escaped by the caller. */
export function shell(opts: { title: string; bodyHtml: string; preheader?: string; footerHtml?: string; siteUrl: string; banner?: string | null }) {
  const { title, bodyHtml, preheader = '', footerHtml = '', siteUrl, banner } = opts;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(title)}</title></head>
<body style="margin:0;padding:0;background:#EFF3FA;font-family:Roboto,Helvetica,Arial,sans-serif;color:${NAVY}">
<span style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#EFF3FA;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden">
<tr><td style="background:${NAVY};padding:22px 32px;text-align:center"><a href="${escapeHtml(siteUrl)}" style="color:#ffffff;text-decoration:none;font-family:Georgia,serif;font-size:24px;font-weight:700;letter-spacing:.04em">GLOWNEST</a></td></tr>
${banner ? `<tr><td><img src="${escapeHtml(banner)}" alt="" width="600" style="display:block;width:100%;height:auto"></td></tr>` : ''}
<tr><td style="padding:32px;font-size:15px;line-height:1.65">${bodyHtml}</td></tr>
<tr><td style="padding:20px 32px 28px;background:#F7F9FC;color:#6B7A90;font-size:12px;line-height:1.6;text-align:center">${footerHtml || `GLOWNEST Skincare · <a href="${escapeHtml(siteUrl)}" style="color:#6B7A90">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>`}</td></tr>
</table></td></tr></table></body></html>`;
}

export function htmlToText(html: string) {
  return html.replace(/<(style|script)[\s\S]*?<\/\1>/gi, '').replace(/<br\s*\/?>/gi, '\n').replace(/<\/(p|div|tr|h[1-6]|li)>/gi, '\n')
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)').replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}
