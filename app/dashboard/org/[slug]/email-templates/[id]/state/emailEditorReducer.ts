/**
 * EMAIL TEMPLATE EDITOR — STATE REDUCER
 *
 * Centralises all state transitions for the email template editor.
 * Replaces 15+ scattered useState hooks in [id]/page.tsx.
 *
 * Current status: infrastructure-ready — page.tsx still uses useState hooks.
 * Migrate incrementally by replacing individual useState groups with dispatch calls.
 */

import type { EmailBlock } from "../EmailBlockBuilder";
import type { EmailEditorState, AutoSaveStatus, PreviewMode } from "../schema/types";
import { createInitialEmailEditorState } from "../schema/types";

// ── Action types ──────────────────────────────────────────────────────────────

export type EmailEditorAction =
  // Lifecycle
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; name: string; subject: string; body: string; isDefault: boolean; isActive: boolean; variables: string[] }
  | { type: "LOAD_ERROR"; error: string }
  | { type: "SAVE_START" }
  | { type: "SAVE_SUCCESS" }
  | { type: "SAVE_ERROR" }
  | { type: "SET_AUTO_SAVE_STATUS"; status: AutoSaveStatus }

  // Template data
  | { type: "SET_NAME"; name: string }
  | { type: "SET_SUBJECT"; subject: string }
  | { type: "SET_BODY"; body: string }
  | { type: "SET_IS_DEFAULT"; isDefault: boolean }
  | { type: "SET_IS_ACTIVE"; isActive: boolean }
  | { type: "SET_VARIABLES"; variables: string[] }
  | { type: "SET_SENDER_NAME"; name: string }

  // Blocks
  | { type: "SET_BLOCKS"; blocks: EmailBlock[] }
  | { type: "SET_SELECTED_BLOCK"; id: string | null }

  // UI
  | { type: "SET_PREVIEW_MODE"; mode: PreviewMode }
  | { type: "SET_PANEL_WIDTH"; width: number }
  | { type: "SET_LEFT_PANEL_VISIBLE"; visible: boolean }
  | { type: "SET_LEFT_PANEL_TAB"; tab: "blocks" | "settings" }
  | { type: "SET_DOCK_MINIMIZED"; minimized: boolean }

  // Variable replacement
  | { type: "SET_SELECTED_VAR"; varName: string | null }

  // Test send
  | { type: "SET_TEST_EMAIL"; email: string }
  | { type: "TEST_SEND_START" }
  | { type: "TEST_SEND_DONE" };

// ── Reducer ───────────────────────────────────────────────────────────────────

export function emailEditorReducer(
  state: EmailEditorState,
  action: EmailEditorAction,
): EmailEditorState {
  switch (action.type) {
    // ── Lifecycle ────────────────────────────────────────────────────────────
    case "LOAD_START":
      return { ...state, loading: true, error: "" };

    case "LOAD_SUCCESS":
      return {
        ...state,
        loading: false,
        name: action.name,
        subject: action.subject,
        body: action.body,
        isDefault: action.isDefault,
        isActive: action.isActive,
        variables: action.variables,
      };

    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };

    case "SAVE_START":
      return { ...state, saving: true };

    case "SAVE_SUCCESS":
      return { ...state, saving: false };

    case "SAVE_ERROR":
      return { ...state, saving: false };

    case "SET_AUTO_SAVE_STATUS":
      return { ...state, autoSaveStatus: action.status };

    // ── Template data ─────────────────────────────────────────────────────────
    case "SET_NAME":
      return { ...state, name: action.name };
    case "SET_SUBJECT":
      return { ...state, subject: action.subject };
    case "SET_BODY":
      return { ...state, body: action.body };
    case "SET_IS_DEFAULT":
      return { ...state, isDefault: action.isDefault };
    case "SET_IS_ACTIVE":
      return { ...state, isActive: action.isActive };
    case "SET_VARIABLES":
      return { ...state, variables: action.variables };
    case "SET_SENDER_NAME":
      return { ...state, senderName: action.name };

    // ── Blocks ────────────────────────────────────────────────────────────────
    case "SET_BLOCKS":
      return { ...state, blocks: action.blocks };
    case "SET_SELECTED_BLOCK":
      return {
        ...state,
        selectedId: action.id,
        selectedVar: null,
        dockMinimized: action.id === null ? false : state.dockMinimized,
      };

    // ── UI ────────────────────────────────────────────────────────────────────
    case "SET_PREVIEW_MODE":
      return { ...state, previewMode: action.mode };
    case "SET_PANEL_WIDTH":
      return { ...state, panelWidth: action.width };
    case "SET_LEFT_PANEL_VISIBLE":
      return { ...state, leftPanelVisible: action.visible };
    case "SET_LEFT_PANEL_TAB":
      return { ...state, leftPanelTab: action.tab };
    case "SET_DOCK_MINIMIZED":
      return { ...state, dockMinimized: action.minimized };

    // ── Variable replacement ──────────────────────────────────────────────────
    case "SET_SELECTED_VAR":
      return { ...state, selectedVar: action.varName };

    // ── Test send ─────────────────────────────────────────────────────────────
    case "SET_TEST_EMAIL":
      return { ...state, testEmail: action.email };
    case "TEST_SEND_START":
      return { ...state, testSending: true };
    case "TEST_SEND_DONE":
      return { ...state, testSending: false };

    default:
      return state;
  }
}

export { createInitialEmailEditorState };
