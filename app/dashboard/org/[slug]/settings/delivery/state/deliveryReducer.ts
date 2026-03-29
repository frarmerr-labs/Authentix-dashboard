/**
 * DELIVERY SETTINGS — STATE REDUCER
 *
 * Centralises all state transitions for the delivery settings page.
 */

import type { DeliveryIntegration } from "@/lib/api/client";
import type { DeliverySettingsState } from "../schema/types";
import { createInitialDeliveryState } from "../schema/types";

// ── Action types ──────────────────────────────────────────────────────────────

export type DeliverySettingsAction =
  // Loading integrations
  | { type: "LOAD_START" }
  | { type: "LOAD_SUCCESS"; integrations: DeliveryIntegration[] }
  | { type: "LOAD_ERROR"; error: string }

  // In-flight operations
  | { type: "SET_TOGGLING_ID"; id: string | null }
  | { type: "SET_DELETING_ID"; id: string | null }

  // CRUD on integration list
  | { type: "SET_INTEGRATIONS"; integrations: DeliveryIntegration[] }
  | { type: "UPDATE_INTEGRATION_ACTIVE"; id: string; is_active: boolean }
  | { type: "REMOVE_INTEGRATION"; id: string }

  // Error
  | { type: "SET_ERROR"; error: string }

  // Form lifecycle
  | { type: "SHOW_ADD_FORM" }
  | { type: "TOGGLE_ADD_FORM" }
  | { type: "SHOW_EDIT_FORM"; id: string }
  | { type: "HIDE_FORM" }
  | { type: "HIDE_EDIT_FORM" }
  | { type: "FORM_SAVE_START" }
  | { type: "FORM_SAVE_DONE" }

  // Platform default sender
  | { type: "SET_DEFAULT_SENDER_NAME"; name: string }
  | { type: "SET_EDITING_DEFAULT_NAME"; editing: boolean }
  | { type: "SET_DEFAULT_NAME_DRAFT"; draft: string }
  | { type: "SET_PLATFORM_DEFAULT_ENABLED"; enabled: boolean };

// ── Reducer ───────────────────────────────────────────────────────────────────

export function deliverySettingsReducer(
  state: DeliverySettingsState,
  action: DeliverySettingsAction,
): DeliverySettingsState {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: "" };
    case "LOAD_SUCCESS":
      return { ...state, loading: false, integrations: action.integrations };
    case "LOAD_ERROR":
      return { ...state, loading: false, error: action.error };

    case "SET_TOGGLING_ID":
      return { ...state, togglingId: action.id };
    case "SET_DELETING_ID":
      return { ...state, deletingId: action.id };

    case "SET_INTEGRATIONS":
      return { ...state, integrations: action.integrations };
    case "UPDATE_INTEGRATION_ACTIVE":
      return {
        ...state,
        integrations: state.integrations.map((i) =>
          i.id === action.id ? { ...i, is_active: action.is_active } : i,
        ),
      };
    case "REMOVE_INTEGRATION":
      return {
        ...state,
        integrations: state.integrations.filter((i) => i.id !== action.id),
      };

    case "SET_ERROR":
      return { ...state, error: action.error };

    case "SHOW_ADD_FORM":
      return { ...state, showAddForm: true, editingId: null };
    case "TOGGLE_ADD_FORM":
      return { ...state, showAddForm: !state.showAddForm, editingId: null };
    case "SHOW_EDIT_FORM":
      return { ...state, editingId: action.id, showAddForm: false };
    case "HIDE_FORM":
      return { ...state, showAddForm: false, editingId: null, saving: false };
    case "HIDE_EDIT_FORM":
      return { ...state, editingId: null };
    case "FORM_SAVE_START":
      return { ...state, saving: true, error: "" };
    case "FORM_SAVE_DONE":
      return { ...state, saving: false };

    case "SET_DEFAULT_SENDER_NAME":
      return { ...state, defaultSenderName: action.name };
    case "SET_EDITING_DEFAULT_NAME":
      return { ...state, editingDefaultName: action.editing };
    case "SET_DEFAULT_NAME_DRAFT":
      return { ...state, defaultNameDraft: action.draft };
    case "SET_PLATFORM_DEFAULT_ENABLED":
      return { ...state, platformDefaultEnabled: action.enabled };

    default:
      return state;
  }
}

export { createInitialDeliveryState };
