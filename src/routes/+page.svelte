<script lang="ts">
  /**
   * /create/manual — manual KWT set builder.
   *
   * Users build exercises from scratch (no OCR). Each exercise has:
   *   - Original sentence
   *   - Keyword (ALL CAPS)
   *   - Gapped sentence (with ______ as the gap)
   *   - Correct answer
   *   - Max words (3 / 4 / 5)
   *
   * On publish, posts directly to /api/sets and redirects to the public link.
   */

  import { goto } from '$app/navigation';
  import { t } from '$lib/i18n.svelte.js';
  import type { ParsedKWTQuestion } from '$lib/types.js';

  const GAP = '______';

  interface DraftQuestion extends ParsedKWTQuestion {
    /** Unique local key for Svelte keyed each-blocks. */
    _key: number;
  }

  let nextKey = 0;
  let title = $state('');
  let questions = $state<DraftQuestion[]>([]);
  let isPublishing = $state(false);
  let errorMessage = $state('');

  /** Creates a blank KWT exercise and appends it to the list. */
  function addQuestion() {
    questions.push({
      _key: nextKey++,
      sentence1: '',
      sentence2WithGap: '',
      keyword: '',
      correctAnswer: null,
      maxWords: 5,
    });
  }

  /**
   * Removes the exercise at the given index.
   * @param i - Index in the questions array.
   */
  function removeQuestion(i: number) {
    questions.splice(i, 1);
  }

  /**
   * Uppercases the keyword field as the user types.
   * @param i - Index of the question.
   * @param value - Current raw value.
   */
  function onKeywordInput(i: number, value: string) {
    questions[i].keyword = value.toUpperCase().replace(/[^A-Z]/g, '');
  }

  /**
   * Inserts the canonical gap placeholder at the cursor position in sentence2.
   * @param i - Question index.
   * @param el - The textarea element.
   */
  function insertGap(i: number, el: HTMLTextAreaElement) {
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    const before = el.value.slice(0, start);
    const after = el.value.slice(end);
    questions[i].sentence2WithGap = `${before}${GAP}${after}`;
    // Restore focus after state update.
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + GAP.length;
    });
  }

  /**
   * Returns a validation error for a question, or null if valid.
   * @param q - The draft question to validate.
   */
  function questionError(q: DraftQuestion): string | null {
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

  /** Publishes the set and redirects to the live URL. */
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
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? 'Failed to save.');
      }
      const { slug } = await res.json();
      goto(`/set/${slug}`);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown error.';
    } finally {
      isPublishing = false;
    }
  }
</script>

<svelte:head><title>{t('manual.title')} — WorksheetApp</title></svelte:head>

<div class="manual-page">
  <div class="top-bar">
    <div>
      <h1>{t('manual.title')}</h1>
      <p class="subtitle">{t('manual.subtitle')}</p>
    </div>
    <button
      class="btn-primary pub-btn"
      disabled={!isValid || isPublishing}
      onclick={publish}
      title={!isValid ? 'Uzupełnij wszystkie pola i oznacz odpowiedzi.' : ''}
    >
      {#if isPublishing}
        <span class="spinner"></span> {t('manual.publishing')}
      {:else}
        {t('manual.publish')}
      {/if}
    </button>
  </div>

  <div class="title-row">
    <label class="field-label" for="set-title">{t('manual.setTitle')}</label>
    <input
      id="set-title"
      class="text-input title-input"
      type="text"
      bind:value={title}
      placeholder={t('manual.setTitlePlaceholder')}
    />
  </div>

  {#if errorMessage}
    <p class="error-banner" role="alert">{errorMessage}</p>
  {/if}

  {#if questions.length === 0}
    <div class="empty-state card">{t('manual.empty')}</div>
  {:else}
    <div class="questions">
      {#each questions as q, i (q._key)}
        {@const err = questionError(q)}
        <div class="q-card card" class:has-error={err !== null}>
          <div class="q-header">
            <span class="q-num">#{i + 1}</span>
            {#if err}<span class="q-err-badge">⚠ {err}</span>{/if}
            <button class="btn-danger rm-btn" onclick={() => removeQuestion(i)} aria-label="{t('common.remove')} #{i+1}">✕</button>
          </div>

          <!-- Sentence 1 -->
          <label class="field-label" for="s1-{i}">{t('review.sentence1')}</label>
          <textarea id="s1-{i}" class="text-input" rows="2"
            bind:value={q.sentence1}
            placeholder={t('review.sentence1ph')}>
          </textarea>

          <!-- Keyword -->
          <label class="field-label" for="kw-{i}">{t('review.keyword')}</label>
          <div class="kw-row">
            <input id="kw-{i}" class="text-input kw-input" type="text"
              value={q.keyword}
              oninput={(e) => onKeywordInput(i, (e.target as HTMLInputElement).value)}
              placeholder={t('review.keywordph')} />
          </div>

          <!-- Sentence 2 with gap -->
          <label class="field-label" for="s2-{i}">{t('review.sentence2')}</label>
          <div class="s2-wrap">
            <textarea id="s2-{i}" class="text-input" rows="2"
              bind:value={q.sentence2WithGap}
              placeholder={t('review.sentence2ph')}>
            </textarea>
            <button
              type="button"
              class="insert-gap-btn btn-ghost"
              onclick={(e) => {
                const ta = document.getElementById(`s2-${i}`) as HTMLTextAreaElement;
                insertGap(i, ta);
              }}
              title="Wstaw ______ w miejscu kursora"
            >
              + ______
            </button>
          </div>

          <!-- Answer + max words -->
          <div class="answer-row">
            <div class="answer-field">
              <label class="field-label" for="ans-{i}">{t('review.answer')}</label>
              <input id="ans-{i}" class="text-input" type="text"
                bind:value={q.correctAnswer}
                placeholder={t('review.answerph')} />
            </div>
            <div class="maxwords-field">
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
  {/if}

  <button class="btn-ghost add-btn" onclick={addQuestion}>
    {t('manual.addQuestion')}
  </button>
</div>

<style>
  .manual-page { display: flex; flex-direction: column; gap: 1.25rem; }

  .top-bar { display: flex; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; gap: 1rem; }
  h1 { font-size: 1.75rem; font-weight: 800; }
  .subtitle { color: #868e96; font-size: 0.9rem; margin-top: 0.2rem; }

  .pub-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1.6rem; font-weight: 600; flex-shrink: 0; }

  .title-row { display: flex; flex-direction: column; gap: 0.3rem; }
  .title-input { font-size: 1rem; }

  .empty-state { text-align: center; color: #868e96; padding: 2rem; }

  .questions { display: flex; flex-direction: column; gap: 1rem; }

  .q-card { display: flex; flex-direction: column; gap: 0.75rem; border: 2px solid transparent; transition: border-color 0.2s; }
  .q-card.has-error { border-color: #ffd166; }

  .q-header { display: flex; align-items: center; gap: 0.6rem; }
  .q-num { font-weight: 700; color: #4361ee; }
  .q-err-badge { flex: 1; color: #e76f51; font-size: 0.82rem; font-weight: 600; }
  .rm-btn { padding: 0.25rem 0.6rem; font-size: 0.8rem; margin-left: auto; }

  .text-input { resize: vertical; }

  .kw-row { display: flex; align-items: center; gap: 0.5rem; }
  .kw-input { font-weight: 700; letter-spacing: 0.05em; max-width: 200px; }

  .s2-wrap { display: flex; flex-direction: column; gap: 0.4rem; }
  .insert-gap-btn {
    align-self: flex-start;
    padding: 0.3rem 0.7rem;
    font-size: 0.82rem;
    font-family: monospace;
    font-weight: 700;
  }

  .answer-row { display: flex; gap: 1rem; align-items: flex-end; flex-wrap: wrap; }
  .answer-field { flex: 1; min-width: 200px; display: flex; flex-direction: column; gap: 0.3rem; }
  .maxwords-field { display: flex; flex-direction: column; gap: 0.3rem; }
  .maxwords-field select { width: 120px; cursor: pointer; }

  .add-btn { align-self: flex-start; padding: 0.55rem 1.2rem; font-size: 0.95rem; }
</style>
