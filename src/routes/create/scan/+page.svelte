<script lang="ts">
  /**
   * /create/scan — file upload page with OCR processing.
   * Moved from /create. Sends result to reviewState then navigates to /review.
   */

  import { goto } from '$app/navigation';
  import { reviewState } from '$lib/store.svelte.js';
  import { t } from '$lib/i18n.svelte.js';
  import type { UploadResponse } from '$lib/types.js';

  const MAX_MB = 20;
  const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

  let isDragging = $state(false);
  let isProcessing = $state(false);
  let errorMessage = $state('');
  let selectedFile = $state<File | null>(null);

  /**
   * Validates and stores the chosen file.
   * @param file - The file from the input or drop event.
   */
  function handleFile(file: File) {
    errorMessage = '';
    if (!ACCEPTED.includes(file.type)) { errorMessage = t('scan.errorType'); return; }
    if (file.size > MAX_MB * 1024 * 1024) { errorMessage = t('scan.errorSize'); return; }
    selectedFile = file;
  }

  function onInput(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) handleFile(f);
  }
  function onDragOver(e: DragEvent) { e.preventDefault(); isDragging = true; }
  function onDragLeave() { isDragging = false; }
  function onDrop(e: DragEvent) {
    e.preventDefault(); isDragging = false;
    const f = e.dataTransfer?.files[0];
    if (f) handleFile(f);
  }

  /** Formats bytes to a human-readable size string. */
  function fmt(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
  }

  /** Uploads file, runs OCR, then navigates to /review. */
  async function process() {
    if (!selectedFile) return;
    isProcessing = true;
    errorMessage = '';
    try {
      const fd = new FormData();
      fd.append('file', selectedFile);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? 'Upload failed.');
      }
      const data: UploadResponse = await res.json();
      reviewState.questions = data.questions;
      reviewState.rawText = data.rawText;
      reviewState.title = selectedFile.name.replace(/\.[^.]+$/, '');
      goto('/review');
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown error.';
    } finally {
      isProcessing = false;
    }
  }
</script>

<svelte:head><title>{t('scan.title')} — WorksheetApp</title></svelte:head>

<div class="scan-page">
  <h1>{t('scan.title')}</h1>
  <p class="subtitle">{t('scan.subtitle')}</p>

  <div
    class="drop-zone card"
    class:dragging={isDragging}
    class:has-file={selectedFile}
    ondragover={onDragOver}
    ondragleave={onDragLeave}
    ondrop={onDrop}
    role="button"
    tabindex="0"
    aria-label="Drop zone"
    onkeydown={(e) => e.key === 'Enter' && document.getElementById('fi')?.click()}
  >
    {#if selectedFile}
      <div class="file-preview">
        <span class="file-icon">{selectedFile.type === 'application/pdf' ? '📄' : '🖼️'}</span>
        <div class="file-info">
          <strong>{selectedFile.name}</strong>
          <span class="size">{fmt(selectedFile.size)}</span>
        </div>
        <button class="btn-ghost rm-btn" onclick={() => (selectedFile = null)} aria-label={t('scan.removeFile')}>✕</button>
      </div>
    {:else}
      <div class="drop-hint">
        <span class="drop-icon">☁️</span>
        <p><strong>{t('scan.dropHint')}</strong></p>
        <p class="or">{t('scan.or')}</p>
        <label class="pick-btn btn-primary" for="fi">{t('scan.browse')}</label>
      </div>
    {/if}
    <input id="fi" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf" hidden onchange={onInput} />
  </div>

  {#if errorMessage}
    <p class="error-banner" role="alert">{errorMessage}</p>
  {/if}

  <div class="actions">
    <button class="btn-primary process-btn" disabled={!selectedFile || isProcessing} onclick={process}>
      {#if isProcessing}
        <span class="spinner"></span> {t('scan.processing')}
      {:else}
        {t('scan.process')}
      {/if}
    </button>
  </div>
</div>

<style>
  .scan-page { max-width: 600px; margin: 0 auto; display: flex; flex-direction: column; gap: 1.25rem; }
  h1 { font-size: 1.75rem; font-weight: 800; }
  .subtitle { color: #868e96; font-size: 0.9rem; margin-top: -0.75rem; }

  .drop-zone {
    min-height: 210px;
    border: 2px dashed #ced4da;
    display: flex; align-items: center; justify-content: center;
    transition: border-color 0.2s, background 0.2s;
    cursor: pointer;
  }
  .drop-zone.dragging { border-color: #4361ee; background: #edf2ff; }
  .drop-zone.has-file { border-style: solid; border-color: #4361ee; cursor: default; }

  .drop-hint { text-align: center; color: #495057; }
  .drop-icon { font-size: 2.8rem; display: block; margin-bottom: 0.6rem; }
  .or { color: #adb5bd; margin: 0.4rem 0; }
  .pick-btn {
    display: inline-block;
    padding: 0.5rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    font-weight: 600;
    font-size: 0.9rem;
    font-family: inherit;
  }

  .file-preview { display: flex; align-items: center; gap: 1rem; width: 100%; }
  .file-icon { font-size: 2.2rem; }
  .file-info { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .file-info strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .size { color: #868e96; font-size: 0.82rem; }
  .rm-btn { padding: 0.25rem 0.55rem; flex-shrink: 0; }

  .actions { display: flex; justify-content: flex-end; }
  .process-btn { display: flex; align-items: center; gap: 0.6rem; padding: 0.75rem 1.8rem; font-weight: 600; }
</style>
