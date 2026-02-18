<script lang="ts">
  /**
   * /set/[slug] — interactive KWT test page.
   *
   * Each question shows:
   *  - The original sentence
   *  - The keyword in bold caps
   *  - The gapped sentence with an inline text input where the gap is
   *
   * Correct answers are never sent to the browser.
   */

  import type { PageData } from './$types.js';
  import { goto } from '$app/navigation';
  import { t } from '$lib/i18n.svelte.js';

  let { data } = $props<{ data: PageData }>();

  const GAP = '______';

  /** Maps question id → typed answer string. */
  let answers = $state<Record<number, string>>({});

  let isSubmitting = $state(false);
  let errorMessage = $state('');

  const unanswered = $derived(
    set.questions.filter((q) => !answers[q.id]?.trim()).length
  );

  /**
   * Splits a sentence on the gap placeholder, returning at most two parts.
   * @param s - Sentence string containing `______`.
   * @returns [before, after] tuple.
   */
  function splitGap(s: string): [string, string] {
    const idx = s.indexOf(GAP);
    if (idx === -1) return [s, ''];
    return [s.slice(0, idx), s.slice(idx + GAP.length)];
  }

  async function submit() {
    isSubmitting = true;
    errorMessage = '';
    try {
      const res = await fetch(`/api/sets/${set.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: set.questions.map((q) => ({
            questionId: q.id,
            given: answers[q.id]?.trim() ?? '',
          })),
        }),
      });
      if (!res.ok) { const { error } = await res.json(); throw new Error(error ?? 'Submission failed.'); }
      const { attemptSlug } = await res.json();
      goto(`/result/${attemptSlug}`);
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : 'Unknown error.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<svelte:head><title>{set.title} — WorksheetApp</title></svelte:head>

<div class="set-page">
  <div class="set-header">
    <h1>{set.title}</h1>
    <p class="q-count">{t('set.questions', { n: set.questions.length })}</p>
    <p class="instructions">
      {#if set.questions[0]}
        {t('set.maxWords', { n: set.questions[0].maxWords })} — {t('set.keyword')} wymagany w odpowiedzi.
      {/if}
    </p>
  </div>

  <form onsubmit={(e) => { e.preventDefault(); submit(); }}>
    <div class="questions">
      {#each set.questions as q (q.id)}
        {@const [before, after] = splitGap(q.sentence2WithGap)}
        {@const filled = !!answers[q.id]?.trim()}

        <div class="q-card card" class:filled>
          <div class="q-meta">
            <span class="q-pos">{q.position}.</span>
            <span class="keyword">{t('set.keyword')} <strong>{q.keyword}</strong></span>
            <span class="max-words">{t('set.maxWords', { n: q.maxWords })}</span>
          </div>

          <!-- Sentence 1: original -->
          <p class="sentence1">{q.sentence1}</p>

          <!-- Sentence 2: gapped, with inline input -->
          <div class="sentence2-wrap">
            <span class="s2-label">{t('set.sentence2label')}</span>
            <span class="sentence2">
              {before}<input
                type="text"
                class="gap-input"
                aria-label="Answer for question {q.position}"
                placeholder={t('set.gapPlaceholder')}
                bind:value={answers[q.id]}
              />{after}
            </span>
          </div>
        </div>
      {/each}
    </div>

    {#if errorMessage}
      <p class="error-banner" role="alert">{errorMessage}</p>
    {/if}

    <div class="submit-bar">
      {#if unanswered > 0}
        <p class="hint">{t('set.unanswered', { n: unanswered })}</p>
      {/if}
      <button type="submit" class="btn-primary submit-btn" disabled={isSubmitting}>
        {#if isSubmitting}
          <span class="spinner"></span> {t('set.submitting')}
        {:else}
          {t('set.submit')}
        {/if}
      </button>
    </div>
  </form>
</div>

<style>
  .set-page { display: flex; flex-direction: column; gap: 1.5rem; }

  .set-header { border-bottom: 2px solid #e9ecef; padding-bottom: 1rem; }
  h1 { font-size: 1.75rem; font-weight: 800; }
  .q-count { color: #868e96; margin-top: 0.2rem; }
  .instructions { color: #4361ee; font-size: 0.88rem; margin-top: 0.3rem; font-weight: 500; }

  .questions { display: flex; flex-direction: column; gap: 1rem; }

  .q-card { border: 2px solid transparent; transition: border-color 0.2s; display: flex; flex-direction: column; gap: 0.75rem; }
  .q-card.filled { border-color: #c3fae8; }

  .q-meta { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; }
  .q-pos { font-weight: 800; color: #4361ee; font-size: 1.05rem; }
  .keyword { background: #fff3bf; color: #5c4a00; padding: 0.15rem 0.5rem; border-radius: 4px; font-size: 0.85rem; }
  .keyword strong { font-size: 1rem; letter-spacing: 0.05em; }
  .max-words { color: #868e96; font-size: 0.82rem; margin-left: auto; }

  .sentence1 { color: #495057; font-size: 1rem; line-height: 1.6; font-style: italic; }

  .sentence2-wrap { display: flex; flex-direction: column; gap: 0.3rem; }
  .s2-label { font-size: 0.78rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #868e96; }

  .sentence2 {
    font-size: 1rem;
    line-height: 1.8;
    color: #1a1a2e;
    display: inline;
  }

  .gap-input {
    display: inline-block;
    border: none;
    border-bottom: 2px solid #4361ee;
    background: #edf2ff;
    border-radius: 4px 4px 0 0;
    padding: 0.15rem 0.5rem;
    font-size: 1rem;
    font-family: inherit;
    color: #1a1a2e;
    outline: none;
    min-width: 180px;
    width: 200px;
    transition: border-color 0.15s, background 0.15s;
    vertical-align: baseline;
  }
  .gap-input:focus { border-color: #2f4dd4; background: #dbe4ff; }
  .gap-input::placeholder { color: #adb5bd; font-style: italic; font-size: 0.88rem; }

  .submit-bar { display: flex; align-items: center; justify-content: flex-end; gap: 1rem; flex-wrap: wrap; padding-top: 0.5rem; }
  .hint { color: #e76f51; font-size: 0.9rem; }
  .submit-btn { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 2rem; font-size: 1rem; font-weight: 600; }
</style>
