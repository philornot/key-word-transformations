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
    import KwtQuestionEditor from '$lib/components/KwtQuestionEditor.svelte';
    import {Plus, RocketLaunch} from 'phosphor-svelte';

    const GAP = '______';

    $effect(() => {
        if (reviewState.questions.length === 0) goto('/create/scan');
    });

    let title = $state(reviewState.title || '');
    let questions = $state<ParsedKWTQuestion[]>(
        reviewState.questions.map((q) => ({...q, keyword: q.keyword.toUpperCase()})),
    );
    let isPublishing = $state(false);
    let errorMessage = $state('');

    /** Creates a blank KWT exercise and appends it to the list. */
    function addQuestion() {
        questions.push({sentence1: '', sentence2WithGap: '', keyword: '', correctAnswer: null, maxWords: 5});
    }

    /**
     * Returns a validation error for a question, or null if valid.
     *
     * @param q - The question to validate.
     * @returns Error message string, or null if the question is valid.
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
        questions.every((q) => questionError(q) === null),
    );

    /** Publishes the set and redirects to the live test URL. */
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

<svelte:head>
    <title>{t('review.title')} — Key word transformations</title>
</svelte:head>

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

    <div class="title-row">
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
            <KwtQuestionEditor
                    bind:question={questions[i]}
                    index={i}
                    error={questionError(q)}
                    onRemove={() => questions.splice(i, 1)}
            />
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

    .title-row {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
    }

    .questions {
        display: flex;
        flex-direction: column;
        gap: var(--space-4);
    }

    .add-btn {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        align-self: flex-start;
        padding: var(--space-2) var(--space-5);
    }
</style>