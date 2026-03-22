"use client";

/**
 * EmailBlockBuilder — Canvas-only component.
 * State is fully controlled by the parent (page.tsx).
 * Exports: EmailBlockBuilder, blocksToHtml, defaultBlock, STARTER_BLOCKS, PALETTE, applyPreviewMocks, BlockType, EmailBlock
 */

import { useRef, useLayoutEffect } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Type, AlignLeft, Image as ImageIcon, QrCode, MousePointerClick,
  TableProperties, Minus, ArrowUpDown, LayoutTemplate, Plus, Trash2,
  GripVertical, AlertCircle, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { nanoid } from "nanoid";

// ── Block types ──────────────────────────────────────────────────────────────

export type BlockType =
  | "header"
  | "greeting"
  | "text"
  | "cert_image"
  | "qr_code"
  | "details_box"
  | "cta_button"
  | "linkedin"
  | "divider"
  | "spacer"
  | "footer";

export interface EmailBlock {
  id: string;
  type: BlockType;
  bgColor?: string;
  title?: string;
  titleColor?: string;
  subtitle?: string;
  content?: string;
  textColor?: string;
  fontFamily?: string;
  fontSize?: number;
  detailRows?: Array<{ label: string; value: string }>;
  detailBgColor?: string;
  detailTextColor?: string;
  btnLabel?: string;
  btnUrl?: string;
  btnColor?: string;
  height?: number;
}

// ── Palette catalog (exported for use in left panel) ─────────────────────────

export const PALETTE: { type: BlockType; icon: React.ReactNode; label: string; desc: string }[] = [
  { type: "header",      icon: <Type className="w-3.5 h-3.5" />,              label: "Header",      desc: "Brand banner" },
  { type: "greeting",    icon: <AlignLeft className="w-3.5 h-3.5" />,         label: "Greeting",    desc: "Hi {{name}}" },
  { type: "text",        icon: <AlignLeft className="w-3.5 h-3.5" />,         label: "Text",        desc: "Paragraph" },
  { type: "cert_image",  icon: <ImageIcon className="w-3.5 h-3.5" />,         label: "Cert Image",  desc: "Inline preview" },
  { type: "qr_code",     icon: <QrCode className="w-3.5 h-3.5" />,            label: "QR Code",     desc: "Verify link" },
  { type: "details_box", icon: <TableProperties className="w-3.5 h-3.5" />,   label: "Details",     desc: "Course, date…" },
  { type: "cta_button",  icon: <MousePointerClick className="w-3.5 h-3.5" />, label: "CTA Button",  desc: "Verify button" },
  { type: "linkedin",    icon: <Type className="w-3.5 h-3.5" />,              label: "LinkedIn",    desc: "Share prompt" },
  { type: "divider",     icon: <Minus className="w-3.5 h-3.5" />,             label: "Divider",     desc: "Separator" },
  { type: "spacer",      icon: <ArrowUpDown className="w-3.5 h-3.5" />,       label: "Spacer",      desc: "Empty space" },
  { type: "footer",      icon: <LayoutTemplate className="w-3.5 h-3.5" />,    label: "Footer",      desc: "Footer text" },
];

// ── Default block configs ────────────────────────────────────────────────────

export function defaultBlock(type: BlockType): EmailBlock {
  const id = nanoid(8);
  switch (type) {
    case "header":      return { id, type, bgColor: "#3ECF8E", titleColor: "#ffffff", title: "Congratulations, {{recipient_name}}!", subtitle: "You've completed {{course_name}}" };
    case "greeting":    return { id, type, content: "Hi {{recipient_name}},", textColor: "#374151" };
    case "text":        return { id, type, content: "We are delighted to inform you that you have successfully completed this program. Your certificate is ready below.", textColor: "#4b5563" };
    case "cert_image":  return { id, type };
    case "qr_code":     return { id, type, content: "Scan QR to verify certificate authenticity" };
    case "details_box": return { id, type, detailRows: [{ label: "Course", value: "{{course_name}}" }, { label: "Date Issued", value: "{{issue_date}}" }], detailBgColor: "#f0fdf4", detailTextColor: "#166534" };
    case "cta_button":  return { id, type, btnLabel: "View & Verify Certificate", btnUrl: "{{verification_url}}", btnColor: "#3ECF8E" };
    case "linkedin":    return { id, type, content: "🎓 Share your achievement on LinkedIn and inspire others!", textColor: "#6b7280" };
    case "divider":     return { id, type };
    case "spacer":      return { id, type, height: 24 };
    case "footer":      return { id, type, content: "© {{organization_name}} · Powered by Authentix", textColor: "#9ca3af" };
  }
}

// ── Preview utilities ────────────────────────────────────────────────────────

function makeQrSvg(data: string, px = 120): string {
  const N = 21;
  const m: boolean[][] = Array.from({ length: N }, () => new Array(N).fill(false) as boolean[]);
  const set = (r: number, c: number, v = true) => { if (r >= 0 && r < N && c >= 0 && c < N) m[r][c] = v; };
  for (const [r0, c0] of [[0,0],[0,N-7],[N-7,0]] as [number,number][]) {
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++)
      set(r0+r, c0+c, r===0||r===6||c===0||c===6||(r>=2&&r<=4&&c>=2&&c<=4));
  }
  for (let i = 8; i < N-8; i++) { set(6,i,i%2===0); set(i,6,i%2===0); }
  let h = 0x811c9dc5 | 0;
  for (let i = 0; i < data.length; i++) h = Math.imul(h ^ data.charCodeAt(i), 0x01000193);
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) {
    if ((r<9&&(c<9||c>=N-8))||(r>=N-8&&c<9)||r===6||c===6) continue;
    h = Math.imul(h^(r*31+c), 0x9e3779b9); h = (h^(h>>>16))|0;
    m[r][c] = (h & 0xf) > 5;
  }
  const cs = px/N;
  let rects = '';
  for (let r = 0; r < N; r++) for (let c = 0; c < N; c++)
    if (m[r][c]) rects += `<rect x="${(c*cs).toFixed(1)}" y="${(r*cs).toFixed(1)}" width="${cs.toFixed(1)}" height="${cs.toFixed(1)}"/>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${px} ${px}"><rect width="${px}" height="${px}" fill="#f9fafb"/><g fill="#1a1a1a">${rects}</g></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function makeCertSvg(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="560" height="392" viewBox="0 0 560 392"><rect width="560" height="392" fill="#fafafa" rx="8"/><rect x="12" y="12" width="536" height="368" fill="none" stroke="#3ECF8E" stroke-width="2" rx="6"/><rect x="22" y="22" width="516" height="54" fill="#3ECF8E" rx="3"/><text x="280" y="57" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="17" font-weight="700" fill="white" letter-spacing="2">CERTIFICATE OF ACHIEVEMENT</text><circle cx="280" cy="150" r="36" fill="none" stroke="#3ECF8E" stroke-width="2"/><circle cx="280" cy="150" r="28" fill="#f0fdf4"/><text x="280" y="160" text-anchor="middle" font-size="24" fill="#3ECF8E">✦</text><text x="280" y="210" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="11" fill="#94a3b8" letter-spacing="1">THIS CERTIFIES THAT</text><text x="280" y="245" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="26" font-weight="600" fill="#1e293b">Alex Johnson</text><line x1="155" y1="258" x2="405" y2="258" stroke="#e2e8f0" stroke-width="1"/><text x="280" y="286" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="12" fill="#64748b">has successfully completed</text><text x="280" y="313" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="15" font-weight="600" fill="#3ECF8E">Advanced React Development</text><text x="280" y="356" text-anchor="middle" font-family="-apple-system,sans-serif" font-size="10" fill="#94a3b8">March 22, 2026  ·  Authentix Academy</text></svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

const _CERT_SVG = makeCertSvg();
const _QR_SVG = makeQrSvg("https://verify.authentix.io/abc123");

const PREVIEW_MOCKS: Record<string, string> = {
  recipient_name: "Alex Johnson",
  organization_name: "Authentix Academy",
  issue_date: "March 22, 2026",
  course_name: "Advanced React Development",
  event_name: "Annual Tech Summit 2026",
  event_date: "March 22, 2026",
  award_name: "Employee of the Year",
  training_name: "Leadership Excellence Program",
  membership_type: "Gold Member",
  valid_until: "December 31, 2026",
  completion_date: "March 22, 2026",
  certificate_image_url: _CERT_SVG,
  verification_url: "https://verify.authentix.io/abc123",
};

export function applyPreviewMocks(html: string): string {
  let result = html.replace(/\{\{(\s*[\w.]+\s*)\}\}/g, (_, key: string) => {
    const k = key.trim();
    return PREVIEW_MOCKS[k] ?? `<span style="background:#fef3c7;color:#92400e;padding:1px 4px;border-radius:3px;font-family:monospace;font-size:11px">{{${k}}}</span>`;
  });
  result = result.replace(/https:\/\/api\.qrserver\.com\/v1\/create-qr-code\/[^"' <]*/g, _QR_SVG);
  return result;
}

// ─────────────────────────────────────────────────────────────────────────────

function darken(hex: string): string {
  try {
    const n = parseInt(hex.replace("#", ""), 16);
    const r = Math.max(0, (n >> 16) - 30);
    const g = Math.max(0, ((n >> 8) & 0xff) - 30);
    const b = Math.max(0, (n & 0xff) - 30);
    return "#" + [r, g, b].map(v => v.toString(16).padStart(2, "0")).join("");
  } catch { return hex; }
}

// ── Block → HTML (for actual email sending) ──────────────────────────────────

function blockToHtml(block: EmailBlock): string {
  const ff = block.fontFamily ? `font-family:${block.fontFamily};` : "";
  const fs = block.fontSize ? `font-size:${block.fontSize}px;` : "";
  void fs;

  switch (block.type) {
    case "header":
      return `<div style="background: linear-gradient(135deg, ${block.bgColor || "#3ECF8E"} 0%, ${darken(block.bgColor || "#3ECF8E")} 100%); padding: 44px 32px; text-align: center;">
  <h1 style="color: ${block.titleColor || "#ffffff"}; font-size: 28px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.5px;${ff}">${block.title || ""}</h1>
  ${block.subtitle ? `<p style="color: rgba(255,255,255,0.85); font-size: 16px; margin: 0;${ff}">${block.subtitle}</p>` : ""}
</div>`;

    case "greeting":
      return `<div style="padding: 32px 32px 0;${block.bgColor ? `background:${block.bgColor};` : ""}">
  <p style="font-size: ${block.fontSize || 16}px; color: ${block.textColor || "#374151"}; margin: 0;${ff}">${block.content || "Hi {{recipient_name}},"}</p>
</div>`;

    case "text":
      return `<div style="padding: 16px 32px;${block.bgColor ? `background:${block.bgColor};` : ""}">
  <p style="font-size: ${block.fontSize || 15}px; color: ${block.textColor || "#4b5563"}; line-height: 1.7; margin: 0;${ff}">${block.content || ""}</p>
</div>`;

    case "cert_image":
      return `<div style="margin: 32px; text-align: center;">
  <img src="{{certificate_image_url}}" alt="Your Certificate" style="max-width: 100%; border-radius: 8px; box-shadow: 0 4px 24px rgba(0,0,0,0.10);" />
</div>`;

    case "qr_code":
      return `<div style="text-align: center; margin: 0 32px 28px; padding: 20px; background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px;">
  <a href="{{verification_url}}" style="display: inline-block;">
    <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&amp;color=000000&amp;bgcolor=f9fafb&amp;data={{verification_url}}&amp;qzone=1" alt="Scan to verify" style="width: 120px; height: 120px; border-radius: 4px; display: inline-block;" />
  </a>
  <p style="font-size: 12px; color: #9ca3af; margin: 8px 0 0;${ff}">${block.content || "Scan QR to verify certificate authenticity"}</p>
</div>`;

    case "details_box": {
      const rows = block.detailRows || [];
      const cells = rows.map(r => `    <td style="padding: 4px 8px 4px 0; vertical-align: top;">
      <p style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 2px;">${r.label}</p>
      <p style="font-size: 15px; font-weight: 600; color: ${block.detailTextColor || "#166534"}; margin: 0;">${r.value}</p>
    </td>`).join("\n");
      return `<div style="background: ${block.detailBgColor || "#f0fdf4"}; border: 1px solid #bbf7d0; border-radius: 8px; padding: 20px 24px; margin: 16px 32px 28px;">
  <table style="width: 100%; border-collapse: collapse;"><tr>
${cells}
  </tr></table>
</div>`;
    }

    case "cta_button":
      return `<div style="text-align: center; margin: 24px 32px;">
  <a href="${block.btnUrl || "{{verification_url}}"}" style="display: inline-block; background: ${block.btnColor || "#3ECF8E"}; color: #ffffff; font-size: 15px; font-weight: 600; padding: 13px 32px; border-radius: 8px; text-decoration: none; letter-spacing: 0.2px;${ff}">${block.btnLabel || "View &amp; Verify Certificate"}</a>
</div>`;

    case "linkedin":
      return `<p style="font-size: 14px; color: ${block.textColor || "#6b7280"}; text-align: center; margin: 0 32px 24px;${ff}">${block.content || "🎓 Share your achievement on LinkedIn and inspire others!"}</p>`;

    case "divider":
      return `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 32px;" />`;

    case "spacer":
      return `<div style="height: ${block.height || 24}px;"></div>`;

    case "footer":
      return `<div style="padding: 16px 32px; text-align: center; border-top: 1px solid #e5e7eb;${block.bgColor ? `background:${block.bgColor};` : ""}">
  <p style="font-size: 12px; color: ${block.textColor || "#9ca3af"}; margin: 0;${ff}">${block.content || "© {{organization_name}} · Powered by Authentix"}</p>
</div>`;

    default:
      return "";
  }
}

export function blocksToHtml(blocks: EmailBlock[]): string {
  if (!blocks.length) return "";
  const inner = blocks.map(blockToHtml).join("\n");
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 10px; overflow: hidden; border: 1px solid #e5e7eb;">
${inner}
</div>`;
}

// ── Starter blocks ───────────────────────────────────────────────────────────

export const STARTER_BLOCKS: EmailBlock[] = [
  defaultBlock("header"),
  defaultBlock("greeting"),
  defaultBlock("text"),
  defaultBlock("details_box"),
  defaultBlock("cert_image"),
  defaultBlock("qr_code"),
  defaultBlock("cta_button"),
  defaultBlock("linkedin"),
  defaultBlock("divider"),
  defaultBlock("footer"),
];

const BLOCK_LABELS: Record<BlockType, string> = {
  header: "Header",
  greeting: "Greeting",
  text: "Text Block",
  cert_image: "Certificate Image",
  qr_code: "QR Code",
  details_box: "Details Box",
  cta_button: "CTA Button",
  linkedin: "LinkedIn Nudge",
  divider: "Divider",
  spacer: "Spacer",
  footer: "Footer",
};

// ── EditableText — contenteditable inline text element ───────────────────────

function EditableText({
  value,
  onChange,
  tag: Tag = "span",
  style,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  tag?: keyof JSX.IntrinsicElements;
  style?: React.CSSProperties;
  placeholder?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const isFocused = useRef(false);

  // Sync DOM from prop when not being edited
  useLayoutEffect(() => {
    if (ref.current && !isFocused.current) {
      if (ref.current.textContent !== value) {
        ref.current.textContent = value;
      }
    }
  });

  // Set content on first mount
  useLayoutEffect(() => {
    if (ref.current) ref.current.textContent = value;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const Comp = Tag as any;
  return (
    <Comp
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={placeholder}
      onFocus={() => { isFocused.current = true; }}
      onBlur={(e: React.FocusEvent<HTMLElement>) => {
        isFocused.current = false;
        const text = e.currentTarget.textContent ?? "";
        onChange(text);
      }}
      onClick={(e: React.MouseEvent) => e.stopPropagation()}
      style={{ outline: "none", cursor: "text", ...style }}
    />
  );
}

// ── BlockLiveView — renders a block as actual email HTML with inline editing ─

function BlockLiveView({
  block,
  isSelected,
  onChange,
}: {
  block: EmailBlock;
  isSelected: boolean;
  onChange: (b: EmailBlock) => void;
}) {
  const u = (patch: Partial<EmailBlock>) => onChange({ ...block, ...patch });
  const ff = block.fontFamily || "inherit";

  switch (block.type) {
    case "header":
      return (
        <div style={{ background: `linear-gradient(135deg, ${block.bgColor || "#3ECF8E"} 0%, ${darken(block.bgColor || "#3ECF8E")} 100%)`, padding: "44px 32px", textAlign: "center" }}>
          <EditableText
            value={block.title || ""}
            onChange={v => u({ title: v })}
            tag="h1"
            placeholder="Header title…"
            style={{ color: block.titleColor || "#ffffff", fontSize: 28, fontWeight: 700, margin: "0 0 8px", letterSpacing: "-0.5px", fontFamily: ff, display: "block" }}
          />
          <EditableText
            value={block.subtitle || ""}
            onChange={v => u({ subtitle: v })}
            tag="p"
            placeholder="Subtitle…"
            style={{ color: "rgba(255,255,255,0.85)", fontSize: 16, margin: 0, fontFamily: ff, display: "block" }}
          />
        </div>
      );

    case "greeting":
      return (
        <div style={{ padding: "32px 32px 0", background: block.bgColor || "transparent" }}>
          <EditableText
            value={block.content || ""}
            onChange={v => u({ content: v })}
            tag="p"
            placeholder="Hi {{recipient_name}},"
            style={{ fontSize: block.fontSize || 16, color: block.textColor || "#374151", margin: 0, fontFamily: ff, display: "block" }}
          />
        </div>
      );

    case "text":
      return (
        <div style={{ padding: "16px 32px", background: block.bgColor || "transparent" }}>
          <EditableText
            value={block.content || ""}
            onChange={v => u({ content: v })}
            tag="p"
            placeholder="Enter paragraph text…"
            style={{ fontSize: block.fontSize || 15, color: block.textColor || "#4b5563", lineHeight: 1.7, margin: 0, fontFamily: ff, display: "block" }}
          />
        </div>
      );

    case "cert_image":
      return (
        <div style={{ margin: "32px", textAlign: "center" }}>
          <img src={_CERT_SVG} alt="Certificate" style={{ maxWidth: "100%", borderRadius: 8, boxShadow: "0 4px 24px rgba(0,0,0,0.10)" }} />
          {isSelected && (
            <p style={{ fontSize: 11, color: "#9ca3af", marginTop: 8 }}>
              The real certificate image is inserted at send time
            </p>
          )}
        </div>
      );

    case "qr_code":
      return (
        <div style={{ textAlign: "center", margin: "0 32px 28px", padding: 20, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 8 }}>
          <img src={_QR_SVG} alt="QR Code" style={{ width: 120, height: 120, borderRadius: 4, display: "inline-block" }} />
          <EditableText
            value={block.content || ""}
            onChange={v => u({ content: v })}
            tag="p"
            placeholder="QR caption…"
            style={{ fontSize: 12, color: "#9ca3af", margin: "8px 0 0", fontFamily: ff, display: "block" }}
          />
        </div>
      );

    case "details_box": {
      const rows = block.detailRows || [];
      return (
        <div style={{ background: block.detailBgColor || "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "20px 24px", margin: "16px 32px 28px" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 20 }}>
            {rows.map((r, i) => (
              <div key={i} style={{ minWidth: 110 }}>
                <p style={{ fontSize: 11, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.5px", margin: "0 0 2px" }}>{r.label}</p>
                <p style={{ fontSize: 15, fontWeight: 600, color: block.detailTextColor || "#166534", margin: 0 }}>{r.value}</p>
              </div>
            ))}
          </div>
          {isSelected && rows.length === 0 && (
            <p style={{ fontSize: 12, color: "#9ca3af", margin: 0 }}>No rows yet — add rows in the panel below</p>
          )}
        </div>
      );
    }

    case "cta_button":
      return (
        <div style={{ textAlign: "center", margin: "24px 32px" }}>
          <EditableText
            value={block.btnLabel || ""}
            onChange={v => u({ btnLabel: v })}
            tag="span"
            placeholder="Button label…"
            style={{ display: "inline-block", background: block.btnColor || "#3ECF8E", color: "#ffffff", fontSize: 15, fontWeight: 600, padding: "13px 32px", borderRadius: 8, letterSpacing: "0.2px", fontFamily: ff }}
          />
        </div>
      );

    case "linkedin":
      return (
        <div style={{ padding: "0 32px 24px", textAlign: "center" }}>
          <EditableText
            value={block.content || ""}
            onChange={v => u({ content: v })}
            tag="p"
            placeholder="LinkedIn share message…"
            style={{ fontSize: 14, color: block.textColor || "#6b7280", margin: 0, fontFamily: ff, display: "block" }}
          />
        </div>
      );

    case "divider":
      return <hr style={{ border: "none", borderTop: "1px solid #e5e7eb", margin: "16px 32px" }} />;

    case "spacer":
      return (
        <div style={{ height: block.height || 24, background: isSelected ? "rgba(62,207,142,0.06)" : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
          {isSelected && <span style={{ fontSize: 10, color: "#9ca3af", userSelect: "none" }}>↕ {block.height || 24}px spacer — change height below</span>}
        </div>
      );

    case "footer":
      return (
        <div style={{ padding: "16px 32px", textAlign: "center", borderTop: "1px solid #e5e7eb", background: block.bgColor || "transparent" }}>
          <EditableText
            value={block.content || ""}
            onChange={v => u({ content: v })}
            tag="p"
            placeholder="Footer text…"
            style={{ fontSize: 12, color: block.textColor || "#9ca3af", margin: 0, fontFamily: ff, display: "block" }}
          />
        </div>
      );

    default:
      return null;
  }
}

// ── StyleToolbar — floating style controls for selected block ─────────────────

const FONT_OPTIONS = [
  { value: "", label: "System" },
  { value: "Georgia, 'Times New Roman', serif", label: "Georgia" },
  { value: "Arial, Helvetica, sans-serif", label: "Arial" },
  { value: "'Courier New', Courier, monospace", label: "Courier" },
  { value: "'Trebuchet MS', sans-serif", label: "Trebuchet" },
];

function ColorSwatch({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex items-center gap-1.5 cursor-pointer group/swatch">
      <span className="text-[10px] text-gray-500 font-medium whitespace-nowrap">{label}</span>
      <div className="relative">
        <div
          className="w-6 h-6 rounded border border-gray-200 shadow-sm group-hover/swatch:ring-2 group-hover/swatch:ring-[#3ECF8E]/40 transition-all"
          style={{ background: value || "#ffffff" }}
        />
        <input
          type="color"
          value={value || "#ffffff"}
          onChange={e => onChange(e.target.value)}
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
        />
      </div>
    </label>
  );
}

function StyleToolbar({ block, onChange }: { block: EmailBlock; onChange: (b: EmailBlock) => void }) {
  const u = (patch: Partial<EmailBlock>) => onChange({ ...block, ...patch });
  const { type } = block;

  const showBg    = ["header", "text", "greeting", "footer", "qr_code"].includes(type);
  const showText  = ["header", "text", "greeting", "footer", "linkedin", "cta_button"].includes(type);
  const showFont  = ["header", "text", "greeting", "footer", "linkedin", "cta_button"].includes(type);
  const showSize  = ["text", "greeting"].includes(type);
  const showBtn   = type === "cta_button";
  const showDetailBg = type === "details_box";

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5 bg-white border-t border-[#3ECF8E]/20 text-xs">
      {showBg && (
        <ColorSwatch
          label={type === "header" ? "Header BG" : "Background"}
          value={type === "header" ? (block.bgColor || "#3ECF8E") : (block.bgColor || "#ffffff")}
          onChange={v => u({ bgColor: v })}
        />
      )}
      {type === "header" && (
        <ColorSwatch label="Title color" value={block.titleColor || "#ffffff"} onChange={v => u({ titleColor: v })} />
      )}
      {showText && type !== "header" && (
        <ColorSwatch label="Text color" value={block.textColor || "#374151"} onChange={v => u({ textColor: v })} />
      )}
      {showBtn && (
        <ColorSwatch label="Button color" value={block.btnColor || "#3ECF8E"} onChange={v => u({ btnColor: v })} />
      )}
      {showDetailBg && (
        <>
          <ColorSwatch label="Box BG" value={block.detailBgColor || "#f0fdf4"} onChange={v => u({ detailBgColor: v })} />
          <ColorSwatch label="Value color" value={block.detailTextColor || "#166534"} onChange={v => u({ detailTextColor: v })} />
        </>
      )}
      {showFont && (
        <label className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 font-medium">Font</span>
          <select
            value={block.fontFamily || ""}
            onChange={e => u({ fontFamily: e.target.value })}
            className="text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/40"
          >
            {FONT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
      )}
      {showSize && (
        <label className="flex items-center gap-1.5">
          <span className="text-[10px] text-gray-500 font-medium">Size</span>
          <input
            type="number"
            min={10}
            max={36}
            value={block.fontSize || (type === "greeting" ? 16 : 15)}
            onChange={e => u({ fontSize: Number(e.target.value) })}
            className="w-14 text-[11px] border border-gray-200 rounded px-1.5 py-0.5 bg-white focus:outline-none focus:ring-1 focus:ring-[#3ECF8E]/40"
          />
        </label>
      )}
    </div>
  );
}

// ── Extra controls for complex blocks (details rows, btn url, spacer height) ─

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function BlockExtrasPanel({ block, onChange }: { block: EmailBlock; onChange: (b: EmailBlock) => void }) {
  const u = (patch: Partial<EmailBlock>) => onChange({ ...block, ...patch });

  if (block.type === "details_box") {
    const rows = block.detailRows ?? [];
    return (
      <div className="px-4 pb-4 pt-3 space-y-3 border-t border-[#3ECF8E]/10 bg-[#f0fdf4]/40">
        <p className="text-[10px] font-bold uppercase tracking-widest text-[#3ECF8E]">Detail Rows</p>
        {rows.map((row, i) => (
          <div key={i} className="flex items-center gap-2">
            <Input value={row.label} onChange={e => { const r = [...rows]; r[i] = { ...r[i]!, label: e.target.value }; u({ detailRows: r }); }} placeholder="Label" className="h-7 text-xs w-24" />
            <span className="text-muted-foreground text-xs">→</span>
            <Input value={row.value} onChange={e => { const r = [...rows]; r[i] = { ...r[i]!, value: e.target.value }; u({ detailRows: r }); }} placeholder="{{variable}}" className="h-7 text-xs flex-1 font-mono" />
            <button type="button" onClick={() => u({ detailRows: rows.filter((_, j) => j !== i) })} className="text-destructive/60 hover:text-destructive">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        <button type="button" onClick={() => u({ detailRows: [...rows, { label: "", value: "" }] })} className="flex items-center gap-1 text-xs text-[#3ECF8E] font-medium hover:text-[#34b87a]">
          <Plus className="w-3 h-3" /> Add Row
        </button>
      </div>
    );
  }

  if (block.type === "cta_button") {
    return (
      <div className="px-4 pb-4 pt-3 border-t border-[#3ECF8E]/10 bg-[#f0fdf4]/40">
        <Field label="Button URL">
          <Input value={block.btnUrl ?? ""} onChange={e => u({ btnUrl: e.target.value })} placeholder="{{verification_url}}" className="h-7 text-xs font-mono" />
        </Field>
      </div>
    );
  }

  if (block.type === "spacer") {
    return (
      <div className="px-4 pb-4 pt-3 border-t border-[#3ECF8E]/10 bg-[#f0fdf4]/40">
        <Field label="Height (px)">
          <Input type="number" min={4} max={120} value={block.height ?? 24} onChange={e => u({ height: Number(e.target.value) })} className="h-7 w-24 text-xs" />
        </Field>
      </div>
    );
  }

  return null;
}

// ── Sortable block card ───────────────────────────────────────────────────────

interface SortableBlockCardProps {
  block: EmailBlock;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
  onChange: (b: EmailBlock) => void;
}

function SortableBlockCard({ block, isSelected, onSelect, onRemove, onChange }: SortableBlockCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: block.id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.35 : 1 }}
      className={cn("relative group", isDragging && "z-50")}
    >
      {/* Left selection accent */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-[3px] z-10 transition-all duration-150",
        isSelected ? "bg-[#3ECF8E]" : "bg-transparent group-hover:bg-[#3ECF8E]/40"
      )} />

      {/* Floating controls — visible on hover / when selected */}
      <div className={cn(
        "absolute top-2 right-2 z-20 flex items-center gap-1 px-1.5 py-1 rounded-lg bg-white/95 border border-gray-100 shadow-md transition-opacity pointer-events-auto",
        isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
      )}>
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab active:cursor-grabbing p-0.5 text-gray-400 hover:text-gray-600"
          onClick={e => e.stopPropagation()}
          title="Drag to reorder"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>
        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider px-0.5 select-none">
          {BLOCK_LABELS[block.type]}
        </span>
        <button
          type="button"
          onClick={e => { e.stopPropagation(); onRemove(); }}
          className="p-0.5 text-gray-400 hover:text-red-500 transition-colors"
          title="Remove block"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Rendered block — click anywhere to select */}
      <div
        onClick={onSelect}
        className={cn(
          "transition-all duration-150",
          isSelected && "outline outline-2 outline-[#3ECF8E]/30 outline-offset-[-2px]"
        )}
      >
        <BlockLiveView block={block} isSelected={isSelected} onChange={onChange} />
      </div>

      {/* Style toolbar + extra controls when selected */}
      {isSelected && (
        <>
          <StyleToolbar block={block} onChange={onChange} />
          <BlockExtrasPanel block={block} onChange={onChange} />
        </>
      )}
    </div>
  );
}

// ── Main canvas component ────────────────────────────────────────────────────

export interface EmailBlockBuilderProps {
  blocks: EmailBlock[];
  selectedId: string | null;
  outOfSync: boolean;
  subject?: string;
  onChange: (blocks: EmailBlock[]) => void;
  onSelect: (id: string | null) => void;
  onStartFresh: () => void;
}

export function EmailBlockBuilder({
  blocks,
  selectedId,
  outOfSync,
  subject,
  onChange,
  onSelect,
  onStartFresh,
}: EmailBlockBuilderProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const removeBlock = (id: string) => {
    onChange(blocks.filter(b => b.id !== id));
    if (selectedId === id) onSelect(null);
  };

  const updateBlock = (updated: EmailBlock) => {
    onChange(blocks.map(b => b.id === updated.id ? updated : b));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = blocks.findIndex(b => b.id === active.id);
    const newIndex = blocks.findIndex(b => b.id === over.id);
    onChange(arrayMove(blocks, oldIndex, newIndex));
  };

  if (outOfSync) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-8 py-16 text-center gap-5">
        <div className="p-4 rounded-full bg-amber-500/10">
          <AlertCircle className="w-8 h-8 text-amber-500" />
        </div>
        <div>
          <p className="font-semibold text-base">HTML was edited directly</p>
          <p className="text-sm text-muted-foreground mt-2 max-w-sm leading-relaxed">
            The email HTML was modified in the <strong>HTML Source</strong> panel. To use the visual builder again, start fresh — this will replace the current HTML with default blocks.
          </p>
        </div>
        <Button onClick={onStartFresh} className="gap-2 bg-[#3ECF8E] hover:bg-[#34b87a] text-white">
          <RefreshCw className="w-4 h-4" />
          Start fresh with Builder
        </Button>
        <p className="text-xs text-muted-foreground">Your current HTML is preserved in the <strong>HTML Source</strong> panel on the left.</p>
      </div>
    );
  }

  if (blocks.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 py-24 px-8 text-center">
        <LayoutTemplate className="w-12 h-12 text-[#3ECF8E]/20" />
        <p className="font-medium text-sm text-muted-foreground">No blocks yet</p>
        <p className="text-xs text-muted-foreground/60">Add blocks from the panel on the left</p>
      </div>
    );
  }

  const subjectLine = subject?.replace(/\{\{[\w\s.]+\}\}/g, m => {
    const k = m.slice(2,-2).trim();
    return (PREVIEW_MOCKS[k] ?? k).split(" ")[0] ?? k;
  }) || "Your Certificate is Ready";

  return (
    <div className="py-5 px-4">
      {/* ── Email client chrome ─────────────────────────────────────────────── */}
      <div className="max-w-[600px] mx-auto shadow-xl rounded-2xl overflow-hidden border border-gray-200/70">

        {/* Simulated email header (Gmail-like) */}
        <div className="bg-white border-b border-gray-100 px-5 py-3.5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-full bg-[#3ECF8E] flex items-center justify-center text-white text-sm font-bold shrink-0 select-none">
              A
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-semibold text-gray-900">Authentix Academy</span>
                <span className="text-xs text-gray-400">info@xencus.com</span>
              </div>
              <p className="text-xs text-gray-400 truncate mt-0.5">
                to Alex Johnson &nbsp;·&nbsp; <span className="italic">{subjectLine}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 text-gray-300 text-xs select-none shrink-0">
              <span>just now</span>
            </div>
          </div>
        </div>

        {/* Email body — blocks rendered as actual email HTML */}
        <div className="bg-white">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={blocks.map(b => b.id)} strategy={verticalListSortingStrategy}>
              <div>
                {blocks.map(block => (
                  <SortableBlockCard
                    key={block.id}
                    block={block}
                    isSelected={block.id === selectedId}
                    onSelect={() => onSelect(block.id === selectedId ? null : block.id)}
                    onRemove={() => removeBlock(block.id)}
                    onChange={updateBlock}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      </div>
      <div className="h-8" />
    </div>
  );
}
