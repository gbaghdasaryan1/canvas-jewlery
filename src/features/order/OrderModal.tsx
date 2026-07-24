import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ApiError } from "@/shared/lib/api";
import { useT, type Dict } from "@/shared/i18n";
import { createOrder, requestOtp, verifyOtp } from "./api/orderApi";
import type { OrderPayload } from "./model/types";
import styles from "./OrderModal.module.css";

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

// OTP verification is disabled for now: the phone step submits the order
// directly with no SMS code. Flip back to true to restore the /otp/request →
// /otp/verify flow (all of that code is kept below, just bypassed). When
// disabled the order is created with an empty verification token.
const OTP_ENABLED = false;

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
    return () => {
      document.body.style.overflow = prev;
    };
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
    // OTP disabled: skip the SMS code and place the order straight from the phone.
    if (!OTP_ENABLED) {
      await placeOrder(normalizePhone(phone), "");
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

  // Build the payload and create the order with an already-verified phone
  // (verificationToken is empty when OTP is disabled). Shared by the direct
  // phone-step submit and the OTP-verify path.
  async function placeOrder(p: string, verificationToken: string) {
    const payload = buildPayload();
    if (!payload) {
      setError(o.errNotReady);
      return;
    }
    setBusy(true);
    try {
      await createOrder(p, verificationToken, payload);
      setStep("done");
    } catch (e) {
      setError(messageFor(e, o.errOrderFailed, o));
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
    let verificationToken: string;
    try {
      ({ verificationToken } = await verifyOtp(p, code.trim()));
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setError(o.errBadCode);
      } else {
        setError(messageFor(e, o.errOrderFailed, o));
      }
      setBusy(false);
      return;
    }
    setBusy(false);
    await placeOrder(p, verificationToken);
  }

  return createPortal(
    <div className={styles.backdrop} onMouseDown={() => !busy && onClose()}>
      <div
        ref={modalRef}
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-label={o.title}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <button className={styles.x} onClick={onClose} disabled={busy} aria-label={o.close}>
          ×
        </button>

        {step === "phone" && (
          <>
            <div className={`${styles.eyebrow} mono`}>{o.eyebrow}</div>
            <h3 className={styles.title}>{o.title}</h3>
            <p className={styles.sub}>{summary ?? o.fallbackSummary}</p>
            <label className={`${styles.label} mono`} htmlFor="om-phone">
              {o.phoneLabel}
            </label>
            <input
              id="om-phone"
              className={`${styles.input} mono`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              placeholder="+374 XX XXXXXX"
              onChange={(e) => setPhone(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendCode()}
              autoFocus
            />
            {error && <div className={`${styles.error} mono`}>{error}</div>}
            <button
              className={`btn-primary lg ${styles.submit}`}
              onClick={sendCode}
              disabled={busy}
            >
              {OTP_ENABLED ? (busy ? o.sending : o.sendCode) : busy ? o.placing : o.placeOrder}
            </button>
          </>
        )}

        {step === "otp" && (
          <>
            <div className={`${styles.eyebrow} mono`}>{o.verifyEyebrow}</div>
            <h3 className={styles.title}>{o.enterCodeTitle}</h3>
            <p className={styles.sub}>
              {o.sentTo} <b>{normalizePhone(phone)}</b>.{" "}
              <button
                className={`${styles.link} mono`}
                onClick={() => setStep("phone")}
                disabled={busy}
              >
                {o.change}
              </button>
            </p>
            <label className={`${styles.label} mono`} htmlFor="om-code">
              {o.codeLabel}
            </label>
            <input
              id="om-code"
              ref={codeRef}
              className={`${styles.input} mono ${styles.code}`}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              placeholder="——————"
              onChange={(e) => setCode(e.target.value.replace(/[^\d]/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && verifyAndOrder()}
            />
            {error && <div className={`${styles.error} mono`}>{error}</div>}
            <button
              className={`btn-primary lg ${styles.submit}`}
              onClick={verifyAndOrder}
              disabled={busy}
            >
              {busy ? o.placing : o.verifyOrder}
            </button>
            <button
              className={`${styles.link} mono ${styles.resend}`}
              onClick={sendCode}
              disabled={busy || resendIn > 0}
            >
              {resendIn > 0 ? o.resendIn(resendIn) : o.resend}
            </button>
          </>
        )}

        {step === "done" && (
          <div className={styles.done}>
            <div className={styles.check} aria-hidden>
              ✓
            </div>
            <h3 className={styles.title}>{o.doneTitle}</h3>
            <p className={styles.sub}>{o.doneBody}</p>
            <button className={`btn-primary lg ${styles.submit}`} onClick={onClose}>
              {o.done}
            </button>
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
