"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import type { AlertItem, FieldDetail, FieldListItem, ImpactResponse } from "@/lib/client/api";
import { useAppStore } from "@/lib/store";

function message(e: unknown): string {
  return e instanceof Error ? e.message : "Request failed";
}

export function useFields() {
  const [fields, setFields] = useState<FieldListItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshTick = useAppStore((s) => s.refreshTick);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.listFields();
        if (!cancelled) {
          setFields(res.fields);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(message(e));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const reload = useCallback(async () => {
    try {
      const res = await api.listFields();
      setFields(res.fields);
      setError(null);
    } catch (e) {
      setError(message(e));
    }
  }, []);

  return { fields, error, reload };
}

export function useFieldDetail(id: string | null) {
  const [detail, setDetail] = useState<FieldDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshTick = useAppStore((s) => s.refreshTick);

  // the detail shown is always the one for the CURRENT id (no stale state)
  const active = detail && detail.field.id === id ? detail : null;

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.getField(id);
        if (!cancelled) {
          setDetail(res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(message(e));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [id, refreshTick]);

  const reload = useCallback(async () => {
    if (!id) return;
    try {
      const res = await api.getField(id);
      setDetail(res);
      setError(null);
    } catch (e) {
      setError(message(e));
    }
  }, [id]);

  return { detail: active, error, loading: !active && !error, reload };
}

export function useImpact() {
  const [data, setData] = useState<ImpactResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshTick = useAppStore((s) => s.refreshTick);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.getImpact();
        if (!cancelled) {
          setData(res);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(message(e));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const reload = useCallback(async () => {
    try {
      const res = await api.getImpact();
      setData(res);
      setError(null);
    } catch (e) {
      setError(message(e));
    }
  }, []);

  return { data, error, loading: !data && !error, reload };
}

export function useAlerts() {
  const [alerts, setAlerts] = useState<AlertItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const refreshTick = useAppStore((s) => s.refreshTick);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await api.listAlerts();
        if (!cancelled) {
          setAlerts(res.alerts);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(message(e));
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const reload = useCallback(async () => {
    try {
      const res = await api.listAlerts();
      setAlerts(res.alerts);
      setError(null);
    } catch (e) {
      setError(message(e));
    }
  }, []);

  return { alerts, error, reload };
}
