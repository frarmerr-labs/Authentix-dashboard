/**
 * EMAIL TEMPLATE EDITOR — CUSTOM STATE HOOK
 *
 * Wraps useReducer and exposes the same API as the original useState calls
 * so the component JSX is unchanged — only the state declaration block is replaced.
 */

import { useReducer, useCallback, useRef } from "react";
import type { EmailBlock } from "../EmailBlockBuilder";
import { emailEditorReducer, createInitialEmailEditorState } from "./emailEditorReducer";
import type { AutoSaveStatus, PreviewMode } from "../schema/types";

export function useEmailEditorState() {
  const [state, dispatch] = useReducer(emailEditorReducer, createInitialEmailEditorState());

  // Keep a ref to current state so functional updaters never close over stale state
  const stateRef = useRef(state);
  stateRef.current = state;

  // ── Template data ────────────────────────────────────────────────────────

  const setName = useCallback((name: string) => {
    dispatch({ type: "SET_NAME", name });
  }, []);

  const setSubject = useCallback((subject: string) => {
    dispatch({ type: "SET_SUBJECT", subject });
  }, []);

  const setBody = useCallback((body: string) => {
    dispatch({ type: "SET_BODY", body });
  }, []);

  const setIsDefault = useCallback((isDefault: boolean) => {
    dispatch({ type: "SET_IS_DEFAULT", isDefault });
  }, []);

  const setIsActive = useCallback((isActive: boolean) => {
    dispatch({ type: "SET_IS_ACTIVE", isActive });
  }, []);

  const setVariables = useCallback((variables: string[]) => {
    dispatch({ type: "SET_VARIABLES", variables });
  }, []);

  const setSenderName = useCallback((name: string) => {
    dispatch({ type: "SET_SENDER_NAME", name });
  }, []);

  // ── Blocks ────────────────────────────────────────────────────────────────

  const setBlocks = useCallback(
    (updater: EmailBlock[] | ((prev: EmailBlock[]) => EmailBlock[])) => {
      const next = typeof updater === "function"
        ? updater(stateRef.current.blocks)
        : updater;
      dispatch({ type: "SET_BLOCKS", blocks: next });
    },
    [],
  );

  const setSelectedId = useCallback((id: string | null) => {
    dispatch({ type: "SET_SELECTED_BLOCK", id });
  }, []);

  // ── Lifecycle ─────────────────────────────────────────────────────────────

  const setLoading = useCallback((loading: boolean) => {
    if (loading) dispatch({ type: "LOAD_START" });
  }, []);

  const setSaving = useCallback((saving: boolean) => {
    if (saving) dispatch({ type: "SAVE_START" });
    else dispatch({ type: "SAVE_SUCCESS" });
  }, []);

  const setError = useCallback((error: string) => {
    dispatch({ type: "LOAD_ERROR", error });
  }, []);

  const setAutoSaveStatus = useCallback((status: AutoSaveStatus) => {
    dispatch({ type: "SET_AUTO_SAVE_STATUS", status });
  }, []);

  /** Call after a successful template load */
  const onLoadSuccess = useCallback((data: {
    name: string;
    subject: string;
    body: string;
    isDefault: boolean;
    isActive: boolean;
    variables: string[];
  }) => {
    dispatch({
      type: "LOAD_SUCCESS",
      name: data.name,
      subject: data.subject,
      body: data.body,
      isDefault: data.isDefault,
      isActive: data.isActive,
      variables: data.variables,
    });
  }, []);

  // ── UI ────────────────────────────────────────────────────────────────────

  const setPreviewMode = useCallback((mode: PreviewMode) => {
    dispatch({ type: "SET_PREVIEW_MODE", mode });
  }, []);

  const setPanelWidth = useCallback((width: number) => {
    dispatch({ type: "SET_PANEL_WIDTH", width });
  }, []);

  const setLeftPanelVisible = useCallback((visible: boolean) => {
    dispatch({ type: "SET_LEFT_PANEL_VISIBLE", visible });
  }, []);

  const setLeftPanelTab = useCallback((tab: "blocks" | "settings") => {
    dispatch({ type: "SET_LEFT_PANEL_TAB", tab });
  }, []);

  const setDockMinimized = useCallback(
    (updater: boolean | ((prev: boolean) => boolean)) => {
      const next = typeof updater === "function"
        ? updater(stateRef.current.dockMinimized)
        : updater;
      dispatch({ type: "SET_DOCK_MINIMIZED", minimized: next });
    },
    [],
  );

  // ── Var replacement ───────────────────────────────────────────────────────

  const setSelectedVar = useCallback((varName: string | null) => {
    dispatch({ type: "SET_SELECTED_VAR", varName });
  }, []);

  // ── Test send ─────────────────────────────────────────────────────────────

  const setTestEmail = useCallback((email: string) => {
    dispatch({ type: "SET_TEST_EMAIL", email });
  }, []);

  const setTestSending = useCallback((sending: boolean) => {
    if (sending) dispatch({ type: "TEST_SEND_START" });
    else dispatch({ type: "TEST_SEND_DONE" });
  }, []);

  return {
    // State (spread so components access as `name`, `body`, etc.)
    ...state,
    // Setters
    setName,
    setSubject,
    setBody,
    setIsDefault,
    setIsActive,
    setVariables,
    setSenderName,
    setBlocks,
    setSelectedId,
    setLoading,
    setSaving,
    setError,
    setAutoSaveStatus,
    setPreviewMode,
    setPanelWidth,
    setLeftPanelVisible,
    setLeftPanelTab,
    setDockMinimized,
    setSelectedVar,
    setTestEmail,
    setTestSending,
    // Composite
    onLoadSuccess,
    dispatch,
  };
}
