import { useCallback, useRef, useState } from "react";
import type { DragEvent } from "react";
import { usePendant } from "../model/store";
import {
  DropZone,
  ErrorText,
  GhostButton,
  HiddenFileInput,
  Hint,
  PreviewThumb,
  ProgressFill,
  ProgressTrack,
  Row,
  Section,
  SectionTitle,
} from "./styles";

const ACCEPTED = ["image/png", "image/jpeg", "image/webp"];
const MAX_BYTES = 20 * 1024 * 1024;
const MAX_STL_BYTES = 50 * 1024 * 1024;

/** Drag & drop / click upload with validation; kicks off the segmentation
 *  pipeline via the store. */
export function UploadArea() {
  const status = usePendant((s) => s.status);
  const progress = usePendant((s) => s.progress);
  const pipelineError = usePendant((s) => s.error);
  const fileName = usePendant((s) => s.fileName);
  const originalUrl = usePendant((s) => s.silhouette?.originalUrl ?? null);
  const loadImage = usePendant((s) => s.loadImage);
  const loadStlFile = usePendant((s) => s.loadStlFile);
  const importedStl = usePendant((s) => s.importedStl);
  const clearImportedStl = usePendant((s) => s.clearImportedStl);

  const inputRef = useRef<HTMLInputElement>(null);
  const stlInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const processing = status === "processing";

  const handleFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!ACCEPTED.includes(file.type)) {
        setValidationError("Unsupported format — use PNG, JPG, JPEG or WEBP.");
        return;
      }
      if (file.size > MAX_BYTES) {
        setValidationError("File is too large — the maximum is 20 MB.");
        return;
      }
      setValidationError(null);
      void loadImage(file);
    },
    [loadImage],
  );

  const handleStlFile = useCallback(
    (file: File | undefined) => {
      if (!file) return;
      if (!/\.stl$/i.test(file.name)) {
        setValidationError("Not an STL file.");
        return;
      }
      if (file.size > MAX_STL_BYTES) {
        setValidationError("STL is too large — the maximum is 50 MB.");
        return;
      }
      setValidationError(null);
      void loadStlFile(file);
    },
    [loadStlFile],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setDragActive(false);
      if (processing) return;
      const file = e.dataTransfer.files[0];
      if (file && /\.stl$/i.test(file.name)) handleStlFile(file);
      else handleFile(file);
    },
    [handleFile, handleStlFile, processing],
  );

  return (
    <Section>
      <SectionTitle>Upload</SectionTitle>
      <DropZone
        $active={dragActive}
        $disabled={processing}
        onClick={() => !processing && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
      >
        <strong>{processing ? "Processing…" : "Drop an image here"}</strong>
        {!processing && <>&nbsp;or click to browse</>}
        <small>PNG · JPG · WEBP — up to 20 MB · or drop an STL model</small>
      </DropZone>
      <HiddenFileInput
        ref={inputRef}
        accept={ACCEPTED.join(",")}
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />

      {processing && progress && (
        <>
          <Hint>{progress.message}</Hint>
          <ProgressTrack>
            <ProgressFill $pct={progress.progress} $indeterminate={progress.progress === 0} />
          </ProgressTrack>
        </>
      )}

      {validationError && <ErrorText>{validationError}</ErrorText>}
      {status === "error" && pipelineError && <ErrorText>{pipelineError}</ErrorText>}

      {originalUrl && !processing && (
        <PreviewThumb>
          <img src={originalUrl} alt="Uploaded source" />
          <div>{fileName}</div>
        </PreviewThumb>
      )}

      <GhostButton onClick={() => stlInputRef.current?.click()} disabled={processing}>
        Upload STL model
      </GhostButton>
      <HiddenFileInput
        ref={stlInputRef}
        accept=".stl"
        onChange={(e) => {
          handleStlFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {importedStl && (
        <>
          <Hint>
            {importedStl.name} — {importedStl.size.x.toFixed(1)} × {importedStl.size.y.toFixed(1)} ×{" "}
            {importedStl.size.z.toFixed(1)} mm ·{" "}
            {Math.round(importedStl.triangles).toLocaleString()} triangles
          </Hint>
          <Row>
            <GhostButton onClick={clearImportedStl}>Remove STL</GhostButton>
          </Row>
        </>
      )}
    </Section>
  );
}
