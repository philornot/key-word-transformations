<script lang="ts">
  /**
   * /result/[attemptId] — shows score and per-question KWT breakdown.
   * Each question shows the gapped sentence with the correct answer and
   * what the user typed, colour-coded green/red.
   */

  import type { PageData } from './$types.js';
  import { t } from '$lib/i18n.svelte.js';

  let { data } = $props<{ data: PageData }>();

  const GAP = '______';

  const scoreColor = $derived(
    result.percentage >= 80 ? '#2dc653' : result.percentage >= 50 ? '#f4a261' : '#ef233c'
  );

  const verdict = $derived(
    result.percentage === 100 ? t('result.perfect') :
    result.percentage >= 80  ? t('result.great') :
    result.percentage >= 50  ? t('result.good') :
                                t('result.poor')
  );

  /**
   * Renders a gapped sentence with the gap filled by a highlighted span.
   * Returns [before, after] for template interpolation.
   * @param s - Sentence with ______ placeholder.
   */
  function splitGap(s: string): [string, string] {
    const i = s.indexOf(GAP);
    if (i === -1) return [s, ''];
    return [s.slice(0, i), s.slice(i + GAP.length)];
  }
</script>

<svelte:head><title>{t('result.title', { title: result.setTitle })}</title></svelte:head>

<div class="result-page">
  <!-- Score summary -->
  <div class="score-card card">
    <h1>🎉 {result.setTitle}</h1>
    <div class="score-display">
      <span class="fraction" style="color: {scoreColor}">{result.score} / {result.total}</span>
      <span class="pct" style="color: {scoreColor}">{result.percentage}%</span>
    </div>
    <div class="bar-bg">
      <div class="bar-fill" style="width:{result.percentage}%; background:{scoreColor}"
        role="progressbar" aria-valuenow={result.percentage} aria-valuemin={0} aria-valuemax={100}>
      </div>
    </div>
    <p class="verdict">{verdict}</p>
  </div>

  <!-- Breakdown -->
  <h2>{t('result.breakdown')}</h2>

  <div class="answers">
    {#each result.answers as a (a.questionId)}
      {@const [before, after] = splitGap(a.sentence2WithGap)}
      <div class="a-card card" class:correct={a.isCorrect} class:wrong={!a.isCorrect}>
        <div class="a-header">
          <span class="pos">{a.position}.</span>
          <span class="badge" class:badge-ok={a.isCorrect} class:badge-err={!a.isCorrect}>
            {a.isCorrect ? '✓ OK' : '✗'}
          </span>
          <span class="kw-tag">{a.keyword}</span>
        </div>

        <!-- Original sentence -->
        <p class="s1">{a.sentence1}</p>

        <!-- Gapped sentence with answer filled in -->
        <p class="s2">
          {before}<span class="filled-answer" class:answer-correct={a.isCorrect} class:answer-wrong={!a.isCorrect}>
            {a.given || t('result.noAnswer')}
          </span>{after}
        </p>

        {#if !a.isCorrect}
          <div class="correction">
            <span class="corr-label">{t('result.correct')}</span>
            <span class="corr-value">{a.correctAnswer}</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <a href="/" class="btn-ghost back-btn">{t('result.back')}</a>
</div>

<style>
  .result-page { display: flex; flex-direction: column; gap: 1.5rem; }

  .score-card { text-align: center; padding: 2.5rem 2rem; }
  h1 { font-size: 1.5rem; font-weight: 800; margin-bottom: 1.5rem; }
  h2 { font-size: 1.2rem; font-weight: 700; }

  .score-display { display: flex; align-items: baseline; justify-content: center; gap: 1rem; margin-bottom: 1rem; }
  .fraction { font-size: 3.5rem; font-weight: 900; line-height: 1; }
  .pct { font-size: 2rem; font-weight: 700; }

  .bar-bg { background: #e9ecef; border-radius: 99px; height: 12px; overflow: hidden; max-width: 400px; margin: 0 auto 1rem; }
  .bar-fill { height: 100%; border-radius: 99px; transition: width 0.8s ease; }
  .verdict { color: #495057; font-size: 1.05rem; }

  .answers { display: flex; flex-direction: column; gap: 1rem; }

  .a-card { border-left: 4px solid transparent; display: flex; flex-direction: column; gap: 0.6rem; }
  .a-card.correct { border-left-color: #2dc653; }
  .a-card.wrong { border-left-color: #ef233c; }

  .a-header { display: flex; align-items: center; gap: 0.6rem; }
  .pos { font-weight: 800; color: #4361ee; }
  .badge { font-size: 0.78rem; font-weight: 700; padding: 0.15rem 0.55rem; border-radius: 99px; }
  .badge-ok { background: #d3f9d8; color: #1e8a2e; }
  .badge-err { background: #ffe3e3; color: #c92a2a; }
  .kw-tag { background: #fff3bf; color: #5c4a00; padding: 0.1rem 0.4rem; border-radius: 4px; font-size: 0.82rem; font-weight: 700; letter-spacing: 0.04em; }

  .s1 { color: #868e96; font-style: italic; font-size: 0.92rem; line-height: 1.5; }

  .s2 { font-size: 1rem; line-height: 1.8; color: #1a1a2e; }

  .filled-answer {
    display: inline;
    padding: 0.1rem 0.4rem;
    border-radius: 4px;
    font-weight: 600;
  }
  .answer-correct { background: #d3f9d8; color: #1e8a2e; }
  .answer-wrong { background: #ffe3e3; color: #c92a2a; }

  .correction { display: flex; align-items: center; gap: 0.5rem; font-size: 0.88rem; padding: 0.4rem 0.6rem; background: #f8f9fa; border-radius: 6px; }
  .corr-label { color: #868e96; font-weight: 600; white-space: nowrap; }
  .corr-value { color: #1e8a2e; font-weight: 700; }

  .back-btn { align-self: flex-start; padding: 0.55rem 1.2rem; }
</style>
