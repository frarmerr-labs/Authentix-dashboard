/**
 * DELIVERY SETTINGS — CUSTOM STATE HOOK
 *
 * Wraps useReducer and exposes the same API as the original useState calls
 * in page.tsx. Components can destructure exactly as before; only the
 * declaration block changes.
 */

import { useReducer, useCallback } from "react";
import type { DeliveryIntegration } from "@/lib/api/client";
import { deliverySettingsReducer, createInitialDeliveryState } from "./deliveryReducer";

export function useDeliverySettingsState() {
  const [state, dispatch] = useReducer(deliverySettingsReducer, createInitialDeliveryState());

  // ── Integrations list ─────────────────────────────────────────────────────

  const setLoading = useCallback((loading: boolean) => {
    if (loading) dispatch({ type: "LOAD_START" });
  }, []);

  const setIntegrations = useCallback((integrations: DeliveryIntegration[]) => {
    dispatch({ type: "SET_INTEGRATIONS", integrations });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: "SET_ERROR", error });
  }, []);

  // ── Form ──────────────────────────────────────────────────────────────────

  const setShowAddForm = useCallback(
    (value: boolean | ((prev: boolean) => boolean)) => {
      if (typeof value === "function") {
        // toggle form
        dispatch({ type: "TOGGLE_ADD_FORM" });
      } else if (value) {
        dispatch({ type: "SHOW_ADD_FORM" });
      } else {
        dispatch({ type: "HIDE_FORM" });
      }
    },
    [],
  );

  const setEditingId = useCallback((id: string | null) => {
    if (id === null) {
      dispatch({ type: "HIDE_EDIT_FORM" });
    } else {
      dispatch({ type: "SHOW_EDIT_FORM", id });
    }
  }, []);

  const setSaving = useCallback((saving: boolean) => {
    if (saving) {
      dispatch({ type: "FORM_SAVE_START" });
    } else {
      dispatch({ type: "FORM_SAVE_DONE" });
    }
  }, []);

  // ── In-flight operation tracking ──────────────────────────────────────────

  const setTogglingId = useCallback((id: string | null) => {
    dispatch({ type: "SET_TOGGLING_ID", id });
  }, []);

  const setDeletingId = useCallback((id: string | null) => {
    dispatch({ type: "SET_DELETING_ID", id });
  }, []);

  // ── Platform default sender ───────────────────────────────────────────────

  const setDefaultSenderName = useCallback((name: string) => {
    dispatch({ type: "SET_DEFAULT_SENDER_NAME", name });
  }, []);

  const setEditingDefaultName = useCallback((editing: boolean) => {
    dispatch({ type: "SET_EDITING_DEFAULT_NAME", editing });
  }, []);

  const setDefaultNameDraft = useCallback((draft: string) => {
    dispatch({ type: "SET_DEFAULT_NAME_DRAFT", draft });
  }, []);

  const setPlatformDefaultEnabled = useCallback((enabled: boolean) => {
    dispatch({ type: "SET_PLATFORM_DEFAULT_ENABLED", enabled });
  }, []);

  // ── Composite dispatch helpers (used by page handlers) ───────────────────

  /** Called after a successful load of integrations */
  const onLoadSuccess = useCallback((integrations: DeliveryIntegration[]) => {
    dispatch({ type: "LOAD_SUCCESS", integrations });
  }, []);

  /** Called when load fails */
  const onLoadError = useCallback((error: string) => {
    dispatch({ type: "LOAD_ERROR", error });
  }, []);

  /** Toggle a single integration's is_active flag optimistically */
  const updateIntegrationActive = useCallback((id: string, is_active: boolean) => {
    dispatch({ type: "UPDATE_INTEGRATION_ACTIVE", id, is_active });
  }, []);

  return {
    // State
    ...state,
    // Setters (same names as original useState)
    setLoading,
    setIntegrations,
    setError,
    setShowAddForm,
    setEditingId,
    setSaving,
    setTogglingId,
    setDeletingId,
    setDefaultSenderName,
    setEditingDefaultName,
    setDefaultNameDraft,
    setPlatformDefaultEnabled,
    // Composite helpers
    onLoadSuccess,
    onLoadError,
    updateIntegrationActive,
    // Raw dispatch for any edge cases
    dispatch,
  };
}
