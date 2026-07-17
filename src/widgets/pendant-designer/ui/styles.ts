import { Link } from "react-router-dom";
import styled, { css, keyframes } from "styled-components";

/** Styled primitives for the /pendant designer. Colors come from the shared
 *  dark-studio tokens in shared/styles/tokens.css. */

export const PageShell = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--ink);
  color: var(--ivory);
  font-family: var(--body);
`;

export const TopBar = styled.header`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px;
  height: 52px;
  flex: 0 0 auto;
  border-bottom: 1px solid var(--line);
  background: var(--graphite);
`;

export const Brand = styled(Link)`
  font-family: var(--display);
  font-size: 15px;
  letter-spacing: 0.14em;
  color: var(--champagne);
  text-decoration: none;
  white-space: nowrap;
`;

export const Tagline = styled.span`
  font-family: var(--mono);
  font-size: 11px;
  color: var(--faint);
  white-space: nowrap;
`;

export const TopSpacer = styled.div`
  flex: 1;
`;

export const NavLink = styled(Link)`
  font-size: 12px;
  color: var(--mist);
  text-decoration: none;
  white-space: nowrap;
  &:hover {
    color: var(--champagne);
  }
`;

export const Body = styled.div`
  display: flex;
  flex: 1;
  min-height: 0;
`;

export const Side = styled.aside<{ $side: "left" | "right" }>`
  width: ${(p) => (p.$side === "left" ? 296 : 264)}px;
  flex: 0 0 auto;
  overflow-y: auto;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  background: var(--graphite);
  border-${(p) => (p.$side === "left" ? "right" : "left")}: 1px solid var(--line);
`;

export const CanvasArea = styled.main`
  position: relative;
  flex: 1;
  min-width: 0;
  background: var(--ink);
`;

export const Section = styled.section`
  background: var(--panel);
  border: 1px solid var(--line-soft);
  border-radius: var(--r);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

export const SectionTitle = styled.h3`
  margin: 0;
  font-family: var(--mono);
  font-size: 10px;
  font-weight: 400;
  letter-spacing: 0.18em;
  text-transform: uppercase;
  color: var(--faint);
`;

export const Row = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

export const FieldColumn = styled.label`
  display: flex;
  flex-direction: column;
  gap: 5px;
  flex: 1;
  min-width: 0;
`;

export const Label = styled.span`
  font-size: 11.5px;
  color: var(--mist);
  display: flex;
  justify-content: space-between;
  gap: 8px;
`;

export const Value = styled.span`
  font-family: var(--mono);
  font-size: 11px;
  color: var(--champagne);
  white-space: nowrap;
`;

export const RangeInput = styled.input.attrs({ type: "range" })`
  width: 100%;
  accent-color: var(--gold);
  height: 20px;
  cursor: pointer;
`;

export const NumberInput = styled.input.attrs({ type: "number" })`
  width: 64px;
  background: var(--panel-2);
  color: var(--ivory);
  border: 1px solid var(--line);
  border-radius: 8px;
  padding: 5px 7px;
  font-family: var(--mono);
  font-size: 12px;
  &:focus {
    outline: 1px solid var(--gold);
  }
`;

export const SegRow = styled.div`
  display: flex;
  gap: 6px;
`;

export const SegButton = styled.button<{ $active?: boolean }>`
  flex: 1;
  padding: 7px 4px;
  font-size: 11.5px;
  border-radius: 9px;
  border: 1px solid ${(p) => (p.$active ? "var(--gold)" : "var(--line)")};
  background: ${(p) => (p.$active ? "rgba(170, 180, 192, 0.16)" : "var(--panel-2)")};
  color: ${(p) => (p.$active ? "var(--champagne)" : "var(--mist)")};
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
  &:hover {
    border-color: var(--gold);
  }
`;

export const ToggleRow = styled.label`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  color: var(--mist);
  cursor: pointer;
  input {
    accent-color: var(--gold);
    width: 15px;
    height: 15px;
    cursor: pointer;
  }
`;

const buttonBase = css`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 9px;
  cursor: pointer;
  font-size: 12px;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  &:disabled {
    opacity: 0.4;
    cursor: default;
  }
`;

export const ToolButton = styled.button<{ $active?: boolean }>`
  ${buttonBase};
  padding: 6px 10px;
  min-width: 32px;
  border: 1px solid ${(p) => (p.$active ? "var(--gold)" : "var(--line)")};
  background: ${(p) => (p.$active ? "rgba(170, 180, 192, 0.16)" : "var(--panel)")};
  color: var(--mist);
  font-family: var(--mono);
  font-size: 12px;
  &:hover:not(:disabled) {
    color: var(--champagne);
    border-color: var(--gold);
  }
`;

export const PrimaryButton = styled.button`
  ${buttonBase};
  padding: 8px 12px;
  border: 1px solid var(--gold);
  background: rgba(170, 180, 192, 0.14);
  color: var(--champagne);
  &:hover:not(:disabled) {
    background: rgba(170, 180, 192, 0.26);
  }
`;

export const GhostButton = styled.button`
  ${buttonBase};
  padding: 7px 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--mist);
  &:hover:not(:disabled) {
    color: var(--champagne);
    border-color: var(--gold);
  }
`;

export const ToolDivider = styled.span`
  width: 1px;
  height: 22px;
  background: var(--line);
`;

/* ---- upload ---- */

export const DropZone = styled.div<{ $active?: boolean; $disabled?: boolean }>`
  border: 1.5px dashed ${(p) => (p.$active ? "var(--champagne)" : "var(--line)")};
  background: ${(p) => (p.$active ? "rgba(223, 229, 236, 0.07)" : "var(--panel-2)")};
  border-radius: var(--r);
  padding: 18px 12px;
  text-align: center;
  cursor: ${(p) => (p.$disabled ? "wait" : "pointer")};
  color: var(--mist);
  font-size: 12px;
  line-height: 1.5;
  transition: border-color 0.15s, background 0.15s;
  strong {
    color: var(--champagne);
    font-weight: 600;
  }
  small {
    color: var(--faint);
    display: block;
    margin-top: 4px;
  }
`;

export const HiddenFileInput = styled.input.attrs({ type: "file" })`
  display: none;
`;

export const PreviewThumb = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  img {
    width: 54px;
    height: 54px;
    object-fit: contain;
    border-radius: 8px;
    background: repeating-conic-gradient(#22262c 0% 25%, #1a1e23 0% 50%) 0 0 / 12px 12px;
    border: 1px solid var(--line-soft);
  }
  div {
    min-width: 0;
    font-size: 11.5px;
    color: var(--mist);
    overflow-wrap: anywhere;
  }
`;

export const ErrorText = styled.p`
  margin: 0;
  font-size: 11.5px;
  color: #e08f8f;
`;

/* ---- progress ---- */

const shimmer = keyframes`
  from { background-position: 0 0; }
  to { background-position: 200px 0; }
`;

export const ProgressTrack = styled.div`
  width: 100%;
  height: 6px;
  border-radius: 3px;
  background: var(--panel-2);
  overflow: hidden;
`;

export const ProgressFill = styled.div<{ $pct: number; $indeterminate?: boolean }>`
  height: 100%;
  width: ${(p) => (p.$indeterminate ? 100 : Math.round(p.$pct * 100))}%;
  border-radius: 3px;
  background: ${(p) =>
    p.$indeterminate
      ? css`repeating-linear-gradient(90deg, var(--gold), var(--champagne) 50px, var(--gold) 100px)`
      : "var(--gold)"};
  ${(p) =>
    p.$indeterminate &&
    css`
      animation: ${shimmer} 1.2s linear infinite;
    `};
  transition: width 0.2s;
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

export const Spinner = styled.div`
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2px solid var(--line);
  border-top-color: var(--champagne);
  animation: ${spin} 0.8s linear infinite;
`;

export const CanvasOverlay = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 17, 20, 0.72);
  z-index: 5;
`;

export const OverlayCard = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 260px;
  padding: 22px;
  border-radius: var(--r);
  background: var(--panel);
  border: 1px solid var(--line);
  font-size: 12.5px;
  color: var(--mist);
  text-align: center;
`;

export const EmptyState = styled.div`
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: var(--faint);
  font-size: 13px;
  pointer-events: none;
  h2 {
    font-family: var(--display);
    font-weight: 500;
    font-size: 20px;
    color: var(--mist);
    margin: 0;
  }
`;

/* ---- measurements ---- */

export const MeasureGrid = styled.dl`
  margin: 0;
  display: grid;
  grid-template-columns: 1fr auto;
  gap: 6px 12px;
  dt {
    font-size: 11.5px;
    color: var(--mist);
  }
  dd {
    margin: 0;
    font-family: var(--mono);
    font-size: 11.5px;
    color: var(--champagne);
    text-align: right;
  }
`;

/* ---- export menu ---- */

export const MenuWrap = styled.div`
  position: relative;
`;

export const Menu = styled.div`
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  min-width: 168px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 10px;
  padding: 4px;
  z-index: 20;
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.45);
`;

export const MenuItem = styled.button`
  ${buttonBase};
  width: 100%;
  justify-content: space-between;
  padding: 8px 10px;
  border: none;
  background: transparent;
  color: var(--mist);
  border-radius: 7px;
  span {
    font-family: var(--mono);
    font-size: 10px;
    color: var(--faint);
  }
  &:hover:not(:disabled) {
    background: var(--panel-2);
    color: var(--champagne);
  }
`;

export const Hint = styled.p`
  margin: 0;
  font-size: 11px;
  line-height: 1.5;
  color: var(--faint);
`;
