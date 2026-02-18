<script lang="ts">
  /**
   * /review — OCR output correction for KWT exercises.
   * Reads from reviewState (set by /create/scan), lets user fix every field,
   * then publishes via POST /api/sets.
   */

  import { goto } from '$app/navigation';
  import { reviewState } from '$lib/store.svelte.js';
  import { t } from '$lib/i18n.svelte.js';
  import type { ParsedKWTQuestion } from '$lib/types.js';

  const GAP = '______';

  $effect(() => {
    if (reviewState.questions.length === 0) goto('/create/scan');
  });

  let title = $state(reviewState.title || '');
  let questions = $state<ParsedKWTQuestion[]>(
    reviewState.questions.map((q) => ({ ...q, keyword: q.keyword.toUpperCase() }))
  );
  let isPublishing = $state(false);
  let errorMessage = $state('');

  function addQuestion() {
    questions.push({ sentence1: '', sentence2WithGap: '', keyword: '', correctAnswer: null, maxWords: 5 });
  }

  function removeQuestion(i: number) { questions.splice(i, 1); }

  function onKeywordInput(i: number, v: string) {
    questions[i].keyword = v.toUpperCase().replace(/[^A-Z]/g, '');
  }

  function insertGap(i: number, el: HTMLTextAreaElement) {
    const s = el.selectionStart ?? el.value.length;
    const e = el.selectionEnd ?? el.value.length;
    questions[i].sentence2WithGap = el.value.slice(0, s) + GAP + el.value.slice(e);
    requestAnimationFrame(() => { el.focus(); el.selectionStart = el.selectionEnd = s + GAP.length; });
  }

  function questionError(q: ParsedKWTQuestion): string | null {
    if (!q.sentence1.trim()) return t('review.errSentence1');
    if (!q.sentence2WithGap.includes(GAP)) return t('review.errSentence2');
    if (!q.keyword.trim()) return t('review.errKeyword');
    if (!q.correctAnswer?.trim()) return t('review.errAnswer');
    return null;
  }

  const isValid = $derived(
    title.trim().length > 0 &&
    questions.length > 0 &&
    questions.every((q) => questionError(q) === null)
  );

  async function publish() {
    if (!isValid) return;
    isPublishing = true;
    errorMessage = '';
    try {
      const res = await fetch('/api/sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          questions: questions.map((q) => ({
            sentence1: q.sentence1.trim(),
            sentence2WithGap: q.sentence2WithGap.trim(),
            keyword: q.keyword.trim(),
            correctAnswer: q.correctAnswer!.trim(),
            maxWords: q.maxWords,
          })),
        }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(error ?? 'Failed.'); }
      const { slug } = await res.json();
      goto(`/set/${slug}`);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown error.';
    } finally {
      isPublishing = false;
    }
  }
</script>

<svelte:head><title>{t('review.title')} — WorksheetApp</title></svelte:head>

<div class="review-page">
  <div class="top-bar">
    <div>
      <h1>{t('review.title')}</h1>
      <p class="subtitle">{t('review.subtitle', { n: questions.length })}</p>
    </div>
    <button
      class="btn-primary pub-btn"
      disabled={!isValid || isPublishing}
      onclick={publish}
    >
      {#if isPublishing}
        <span class="spinner"></span> {t('review.publishing')}
      {:else}
        {t('review.publish')}
      {/if}
    </button>
  </div>

  <div>
    <label class="field-label" for="set-title">{t('review.setTitle')}</label>
    <input
      id="set-title"
      class="text-input"
      type="text"
      bind:value={title}
      placeholder={t('review.setTitlePlaceholder')}
    />
  </div>

  {#if errorMessage}
    <p class="error-banner" role="alert">{errorMessage}</p>
  {/if}

  <div class="questions">
    {#each questions as q, i (i)}
      {@const err = questionError(q)}
      <div class="q-card card" class:has-error={err !== null}>
        <div class="q-header">
          <span class="q-num">{t('review.questionNum', { n: i + 1 })}</span>
          {#if err}<span class="q-err-badge">⚠ {err}</span>{/if}
          <button class="btn-danger rm-btn" onclick={() => removeQuestion(i)}>✕</button>
        </div>

        <label class="field-label" for="s1-{i}">{t('review.sentence1')}</label>
        <textarea id="s1-{i}" class="text-input" rows="2"
          bind:value={q.sentence1}
          placeholder={t('review.sentence1ph')}>
        </textarea>

        <label class="field-label" for="kw-{i}">{t('review.keyword')}</label>
        <input id="kw-{i}" class="text-input kw-input" type="text"
          value={q.keyword}
          oninput={(e) => onKeywordInput(i, (e.target as HTMLInputElement).value)}
          placeholder={t('review.keywordph')} />

        <label class="field-label" for="s2-{i}">{t('review.sentence2')}</label>
        <div class="s2-wrap">
          <textarea id="s2-{i}" class="text-input" rows="2"
            bind:value={q.sentence2WithGap}
            placeholder={t('review.sentence2ph')}>
          </textarea>
          <button
            type="button"
            class="insert-gap-btn btn-ghost"
            onclick={() => {
              const ta = document.getElementById(`s2-${i}`) as HTMLTextAreaElement;
              insertGap(i, ta);
            }}
          >+ ______</button>
        </div>

        <div class="answer-row">
          <div class="answer-field">
            <label class="field-label" for="ans-{i}">{t('review.answer')}</label>
            <input id="ans-{i}" class="text-input" type="text"
              bind:value={q.correctAnswer}
              placeholder={t('review.answerph')} />
          </div>
          <div class="mw-field">
            <label class="field-label" for="mw-{i}">{t('review.maxWords')}</label>
            <select id="mw-{i}" class="text-input" bind:value={q.maxWords}>
              <option value={3}>{t('common.words3')}</option>
              <option value={4}>{t('common.words4')}</option>
              <option value={5}>{t('common.words5')}</option>
            </select>
          </div>
        </div>
      </div>
    {/each}
  </div>

  <button class="btn-ghost add-btn" onclick={addQuestion}>{t('review.addQuestion')}</button>
</div>

<style>
  .review-page { display: flex; flex-direction: column; gap: 1.25rem; }
  .top-bar { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
  h1 { font-size: 1.75rem; font-weight: 800; }
  .subtitle { color: #868e96; font-size: 0.9rem; margin-top: 0.2rem; }
  .pub-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.6rem; font-weight: 600; flex-shrink: 0; }

  .questions { display: flex; flex-direction: column; gap: 1rem; }

  .q-card { display: flex; flex-direction: column; gap: 0.75rem; border: 2px solid transparent; transition: border-color 0.2s; }
  .q-card.has-error { border-color: #ffd166; }
  .q-header { display: flex; align-items: center; gap: 0.6rem; }
  .q-num { font-weight: 700; color: #4361ee; font-size: 0.9rem; }
  .q-err-badge { flex: 1; color: #e76f51; font-size: 0.82rem; font-weight: 600; }
  .rm-btn { padding: 0.25rem 0.6rem; font-size: 0.8rem; margin-left: auto; }

  .text-input { resize: vertical; }
  .kw-input { font-weight: 700; letter-spacing: 0.05em; max-width: 200px; resize: none; }

  .s2-wrap { display: flex; flex-direction: column; gap: 0.4rem; }
  .insert-gap-btn { align-self: flex-start; padding: 0.3rem 0.7rem; font-size: 0.82rem; font-family: monospace; font-weight: 700; }

  .answer-row { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
  .answer-field { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 0.3rem; }
  .mw-field { display: flex; flex-direction: column; gap: 0.3rem; }
  .mw-field select { width: 120px; cursor: pointer; }

  .add-btn { align-self: flex-start; padding: 0.55rem 1.2rem; }
</style>
