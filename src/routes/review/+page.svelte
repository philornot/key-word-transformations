<script lang="ts">
    /**
     * /review — OCR output correction for KWT exercises.
     * Reads from reviewState (set by /create/scan), lets user fix every field,
     * then publishes via POST /api/sets.
     */

    import {goto} from '$app/navigation';
    import {reviewState} from '$lib/store.svelte.js';
    import {t} from '$lib/i18n.svelte.js';
    import type {ParsedKWTQuestion} from '$lib/types.js';
    import {Plus, RocketLaunch, WarningCircle, XSquare} from 'phosphor-svelte';

    const GAP = '______';

    $effect(() => {
        if (reviewState.questions.length === 0) goto('/create/scan');
    });

    let title = $state(reviewState.title || '');
    let questions = $state<ParsedKWTQuestion[]>(
        reviewState.questions.map((q) => ({...q, keyword: q.keyword.toUpperCase()}))
    );
    let isPublishing = $state(false);
    let errorMessage = $state('');

    /** Creates a blank KWT exercise and appends it to the list. */
    function addQuestion() {
        questions.push({sentence1: '', sentence2WithGap: '', keyword: '', correctAnswer: null, maxWords: 5});
    }

    /**
     * Removes the question at the given index.
     * @param i - Index in the questions array.
     */
    function removeQuestion(i: number) {
        questions.splice(i, 1);
    }

    /**
     * Uppercases keyword as the user types.
     * Accepts Event so no `as` cast is needed in the template.
     * @param i - Question index.
     * @param e - Native input event.
     */
    function onKeywordInput(i: number, e: Event) {
        const raw = (e.currentTarget as HTMLInputElement).value;
        questions[i].keyword = raw.toUpperCase().replace(/[^A-Z]/g, '');
    }

    /**
     * Inserts the canonical gap placeholder at the cursor position.
     * @param i - Question index.
     * @param el - The sentence2 textarea.
     */
    function insertGap(i: number, el: HTMLTextAreaElement) {
        const s = el.selectionStart ?? el.value.length;
        const e = el.selectionEnd ?? el.value.length;
        questions[i].sentence2WithGap = el.value.slice(0, s) + GAP + el.value.slice(e);
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = s + GAP.length;
        });
    }

    /**
     * Retrieves the sentence2 textarea for the given question index and
     * delegates to insertGap. Avoids `as` casts in the template.
     * @param i - Question index.
     */
    function handleInsertGap(i: number) {
        const el = document.getElementById(`s2-${i}`);
        if (el instanceof HTMLTextAreaElement) insertGap(i, el);
    }

    /**
     * Returns a validation error for a question, or null if valid.
     * @param q - The question to validate.
     */
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

    /** Publishes the set and redirects to the live URL. */
    async function publish() {
        if (!isValid) return;
        isPublishing = true;
        errorMessage = '';
        try {
            const res = await fetch('/api/sets', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
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
                const body = await res.json();
                errorMessage = body.error ?? 'Failed.';
                return;
            }
            const {slug} = await res.json();
            await goto(`/set/${slug}`);
        } catch (err) {
            errorMessage = err instanceof Error ? err.message : 'Unknown error.';
        } finally {
            isPublishing = false;
        }
    }
</script>

<svelte:head><title>{t('review.title')} — Key word transformations</title></svelte:head>

<div class="review-page">
    <div class="top-bar">
        <div>
            <h1>{t('review.title')}</h1>
            <p class="subtitle">{t('review.subtitle', {n: questions.length})}</p>
        </div>
        <button
                class="btn-primary pub-btn"
                disabled={!isValid || isPublishing}
                onclick={publish}
        >
            {#if isPublishing}
                <span class="spinner"></span> {t('review.publishing')}
            {:else}
                <RocketLaunch size={18} weight="regular"/> {t('review.publish')}
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
                    <span class="q-num">{t('review.questionNum', {n: i + 1})}</span>
                    {#if err}
                        <span class="q-err-badge"><WarningCircle size={13} weight="bold"/> {err}</span>
                    {/if}
                    <button class="btn-danger rm-btn" onclick={() => removeQuestion(i)}>
                        <XSquare size={15} weight="bold"/>
                    </button>
                </div>

                <label class="field-label" for="s1-{i}">{t('review.sentence1')}</label>
                <textarea id="s1-{i}" class="text-input" rows="2"
                          bind:value={q.sentence1}
                          placeholder={t('review.sentence1ph')}>
        </textarea>

                <label class="field-label" for="kw-{i}">{t('review.keyword')}</label>
                <input id="kw-{i}" class="text-input kw-input" type="text"
                       value={q.keyword}
                       oninput={(e) => onKeywordInput(i, e)}
                       placeholder={t('review.keywordph')}/>

                <label class="field-label" for="s2-{i}">{t('review.sentence2')}</label>
                <div class="s2-wrap">
          <textarea id="s2-{i}" class="text-input" rows="2"
                    bind:value={q.sentence2WithGap}
                    placeholder={t('review.sentence2ph')}>
          </textarea>
                    <button
                            type="button"
                            class="insert-gap-btn btn-ghost"
                            onclick={() => handleInsertGap(i)}
                    >+ ______
                    </button>
                </div>

                <div class="answer-row">
                    <div class="answer-field">
                        <label class="field-label" for="ans-{i}">{t('review.answer')}</label>
                        <input id="ans-{i}" class="text-input" type="text"
                               bind:value={q.correctAnswer}
                               placeholder={t('review.answerph')}/>
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

    <button class="btn-ghost add-btn" onclick={addQuestion}>
        <Plus size={16} weight="bold"/> {t('review.addQuestion')}
    </button>
</div>

<style>
    .review-page {
        display: flex;
        flex-direction: column;
        gap: var(--space-5);
    }

    .top-bar {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: var(--space-4);
    }

    h1 {
        font-size: var(--font-size-3xl);
        font-weight: var(--font-weight-extrabold);
    }

    .subtitle {
        color: var(--color-text-faint);
        font-size: var(--font-size-sm);
        margin-top: var(--space-1);
    }

    .pub-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-6);
        font-weight: var(--font-weight-semibold);
        flex-shrink: 0;
    }

    .questions {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .q-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-3);
        border: 2px solid transparent;
        transition: border-color var(--transition-base);
    }

    .q-card.has-error {
        border-color: var(--color-warning);
    }

    .q-header {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .q-num {
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
        font-size: var(--font-size-sm);
    }

    .q-err-badge {
        flex: 1;
        display: flex;
        align-items: center;
        gap: var(--space-1);
        color: var(--color-warning);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-bold);
    }

    .rm-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        padding: var(--space-1) var(--space-2);
        margin-left: auto;
    }

    .kw-input {
        font-weight: var(--font-weight-bold);
        letter-spacing: var(--letter-spacing-wide);
        max-width: 200px;
        resize: none;
    }

    .s2-wrap {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .insert-gap-btn {
        align-self: flex-start;
        padding: var(--space-1) var(--space-3);
        font-size: var(--font-size-xs);
        font-family: var(--font-mono), monospace;
        font-weight: var(--font-weight-bold);
    }

    .answer-row {
        display: flex;
        gap: var(--space-4);
        align-items: flex-end;
        flex-wrap: wrap;
    }

    .answer-field {
        flex: 1;
        min-width: 200px;
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .mw-field {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .mw-field select {
        width: 120px;
        cursor: pointer;
    }

    .add-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        align-self: flex-start;
        padding: var(--space-2) var(--space-5);
    }
</style>