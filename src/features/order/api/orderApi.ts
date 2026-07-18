import { apiPostForm, apiPostJson } from "@/shared/lib/api";
import type { OrderPayload } from "../model/types";

/**
 * Order + phone-verification API. Contract (base = VITE_API_BASE):
 *
 *   POST /otp/request  { phone }          → 200 { expiresInSec?: number }
 *   POST /otp/verify   { phone, code }    → 200 { verificationToken }   (401 on bad code)
 *   POST /orders       multipart/form-data:
 *          stl               = binary STL file
 *          phone             = verified phone number
 *          verificationToken = token from /otp/verify
 *          options           = JSON string (OrderOptions)
 *                                        → 201 { id, status }
 */

export interface RequestOtpResult {
  /** Seconds until the sent code expires, if the backend reports it. */
  expiresInSec?: number;
}

export interface VerifyOtpResult {
  /** Short-lived token proving the phone was verified; attached to the order. */
  verificationToken: string;
}

export interface CreateOrderResult {
  id: string;
  status: string;
}

/** Send an OTP code to `phone` via SMS (backend picks the provider). */
export function requestOtp(phone: string): Promise<RequestOtpResult> {
  return apiPostJson<RequestOtpResult>("/otp/request", { phone });
}

/** Verify the code the user typed; resolves with a token on success, throws (401) on a bad code. */
export function verifyOtp(phone: string, code: string): Promise<VerifyOtpResult> {
  return apiPostJson<VerifyOtpResult>("/otp/verify", { phone, code });
}

/** Submit the order: STL file + phone + verification token + design options, in one multipart request. */
export function createOrder(
  phone: string,
  verificationToken: string,
  payload: OrderPayload,
): Promise<CreateOrderResult> {
  const form = new FormData();
  form.append("stl", payload.stl, payload.fileName);
  form.append("phone", phone);
  form.append("verificationToken", verificationToken);
  form.append("options", JSON.stringify(payload.options));
  return apiPostForm<CreateOrderResult>("/orders", form);
}
