import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@/shared/lib/api";
import { useT, type Dict } from "@/shared/i18n";
import { createOrder, requestOtp, verifyOtp } from "./api/orderApi";
import type { OrderPayload } from "./model/types";

interface OrderModalProps {
  open: boolean;
  onClose: () => void;
  /** Short summary shown in the header (place · metal). */
  summary?: ReactNode;
  /**
   * Builds the STL + options at submit time (kept lazy so the mesh/volume
   * integral only runs when the user actually confirms the order). Return
   * null if the design isn't ready.
   */
  buildPayload: () => OrderPayload | null;
}

type Step = "phone" | "otp" | "done";

// Loose E.164 check: optional +, 8–15 digits once separators are stripped.
function normalizePhone(raw: string): string {
  const trimmed = raw.trim();
  const plus = trimmed.startsWith("+") ? "+" : "";
  return plus + trimmed.replace(/[^\d]/g, "");
}
function isValidPhone(raw: string): boolean {
  const digits = raw.replace(/[^\d]/g, "");
  return digits.length >= 8 && digits.length <= 15;
}

export function OrderModal({ open, onClose, summary, buildPayload }: OrderModalProps) {
  const o = useT().order;
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("+374 ");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendIn, setResendIn] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Reset to a clean slate whenever the modal is (re)opened.
  useEffect(() => {
    if (open) {
      setStep("phone");
      setCode("");
      setBusy(false);
      setError(null);
      setResendIn(0);
    }
  }, [open]);

  // Lock the page behind the modal so it doesn't scroll while it's open.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  // Escape closes; Tab is trapped inside the dialog for keyboard users.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) {
        onClose();
        return;
      }
      if (e.key === "Tab" && modalRef.current) {
        const items = modalRef.current.querySelectorAll<HTMLElement>(
          'button:not(:disabled), input:not(:disabled), [tabindex]:not([tabindex="-1"])',
        );
        if (items.length === 0) return;
        const first = items[0];
        const last = items[items.length - 1];
        const active = document.activeElement;
        if (e.shiftKey && active === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  // Resend cooldown tick.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendIn]);

  // Autofocus the code field once we reach the OTP step.
  useEffect(() => {
    if (step === "otp") codeRef.current?.focus();
  }, [step]);

  if (!open) return null;

  async function sendCode() {
    setError(null);
    if (!isValidPhone(phone)) {
      setError(o.errValidPhone);
      return;
    }
    setBusy(true);
    try {
      const res = await requestOtp(normalizePhone(phone));
      setStep("otp");
      setResendIn(res.expiresInSec && res.expiresInSec < 120 ? res.expiresInSec : 45);
    } catch (e) {
      setError(messageFor(e, o.errSendFailed, o));
    } finally {
      setBusy(false);
    }
  }

  async function verifyAndOrder() {
    setError(null);
    if (code.trim().length < 4) {
      setError(o.errEnterCode);
      return;
    }
    const p = normalizePhone(phone);
    setBusy(true);
    try {
      const { verificationToken } = await verifyOtp(p, code.trim());
      const payload = buildPayload();
      if (!payload) {
        setError(o.errNotReady);
        return;
      }
      await createOrder(p, verificationToken, payload);
      setStep("done");
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError(o.errBadCode);
      } else {
        setError(messageFor(e, o.errOrderFailed, o));
      }
    } finally {
      setBusy(false);
    }
  }

  return createPortal(
    <div className="om-backdrop" onMouseDown={() => !busy && onClose()}>
      <div ref={modalRef} className="om-modal" role="dialog" aria-modal="true" aria-label={o.title} onMouseDown={(e) => e.stopPropagation()}>
        <button className="om-x" onClick={onClose} disabled={busy} aria-label={o.close}>×</button>

        {step === "phone" && (
          <>
            <div className="om-eyebrow mono">{o.eyebrow}</div>
            <h3 className="om-title">{o.title}</h3>
            <p className="om-sub">{summary ?? o.fallbackSummary}</p>
            <label className="om-label mono" htmlFor="om-phone">{o.phoneLabel}</label>
            <input
              id="om-phone"
              className="om-input mono"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              placeholder="+374 XX XXXXXX"
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
              autoFocus
            />
            {error && <div className="om-error mono">{error}</div>}
            <button className="btn-primary lg om-submit" onClick={sendCode} disabled={busy}>
              {busy ? o.sending : o.sendCode}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <div className="om-eyebrow mono">{o.verifyEyebrow}</div>
            <h3 className="om-title">{o.enterCodeTitle}</h3>
            <p className="om-sub">
              {o.sentTo} <b>{normalizePhone(phone)}</b>.{" "}
              <button className="om-link mono" onClick={() => setStep("phone")} disabled={busy}>{o.change}</button>
            </p>
            <label className="om-label mono" htmlFor="om-code">{o.codeLabel}</label>
            <input
              id="om-code"
              ref={codeRef}
              className="om-input mono om-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              placeholder="——————"
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verifyAndOrder()}
            />
            {error && <div className="om-error mono">{error}</div>}
            <button className="btn-primary lg om-submit" onClick={verifyAndOrder} disabled={busy}>
              {busy ? o.placing : o.verifyOrder}
            </button>
            <button
              className="om-link mono om-resend"
              onClick={sendCode}
              disabled={busy || resendIn > 0}
            >
              {resendIn > 0 ? o.resendIn(resendIn) : o.resend}
            </button>
          </>
        )}

        {step === "done" && (
          <div className="om-done">
            <div className="om-check" aria-hidden>✓</div>
            <h3 className="om-title">{o.doneTitle}</h3>
            <p className="om-sub">{o.doneBody}</p>
            <button className="btn-primary lg om-submit" onClick={onClose}>{o.done}</button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function messageFor(e: unknown, fallback: string, o: Dict["order"]): string {
  if (e instanceof ApiError) {
    // Rate-limit + server/routing failures aren't actionable to the user, so
    // show a friendly line instead of the raw backend text ("Not Found" etc.).
    if (e.status === 0) return o.errNetwork; // request never reached the server
    if (e.status === 429) return o.errRateLimit;
    if (e.status >= 500) return o.errServer;
    if (e.status === 404) return fallback;
    return e.message || fallback;
  }
  // Non-ApiError (shouldn't happen — the axios interceptor normalizes all
  // failures — but keep a safe fallback).
  if (e instanceof TypeError) return o.errNetwork;
  return fallback;
}
