<script lang="ts">
    /**
     * @fileoverview Reusable KWT question card editor.
     * Used by both /review (post-OCR) and /create/manual.
     */

    import {t} from '$lib/i18n.svelte.js';
    import type {ParsedKWTQuestion} from '$lib/types.js';
    import {PlusIcon, WarningCircleIcon, XSquare} from 'phosphor-svelte';
    import {CANONICAL_GAP} from '$lib/constants.js';

    interface Props {
        question: ParsedKWTQuestion;
        index: number;
        onRemove: () => void;
        error: string | null;
        onTouch?: () => void;
    }

    let {question = $bindable(), index, error, onRemove, onTouch}: Props = $props();

    const GAP = '______';

    let newAltAnswer = $state('');
    let newWrongAnswer = $state('');

    /**
     * Uppercases and strips non-alpha characters from keyword input.
     *
     * @param e - Native input event.
     */
    function onKeywordInput(e: Event) {
        const raw = (e.currentTarget as HTMLInputElement).value;
        question.keyword = raw.toUpperCase().replace(/[^A-Z]/g, '');
    }

    /**
     * Normalises the sentence2 textarea value on every keystroke:
     *  - Any run of one or more underscores is replaced with the canonical
     *    six-underscore gap marker `______`.
     *  - Cursor position is preserved so typing feels natural.
     *
     * @param e - Native input event from the sentence2 textarea.
     */
    function onGapInput(e: Event) {
        const el = e.currentTarget as HTMLTextAreaElement;
        const raw = el.value;
        const cursorBefore = raw.slice(0, el.selectionStart ?? 0);

        const normalised = raw.replace(/_+/g, (match) => {
            if (match.length < 6) return match.length === 1 ? CANONICAL_GAP : '';
            return CANONICAL_GAP;
        });

        if (normalised === raw) {
            question.sentence2WithGap = raw;
            return;
        }

        question.sentence2WithGap = normalised;

        const normBefore = cursorBefore.replace(/_+/g, (match) => {
            if (match.length < 6) return match.length === 1 ? CANONICAL_GAP : '';
            return CANONICAL_GAP;
        });

        requestAnimationFrame(() => {
            el.selectionStart = el.selectionEnd = normBefore.length;
        });
    }

    /**
     * Inserts the canonical gap placeholder at the cursor position in sentence2.
     *
     * @param el - The textarea DOM element.
     */
    function insertGap(el: HTMLTextAreaElement) {
        const s = el.selectionStart ?? el.value.length;
        const e = el.selectionEnd ?? el.value.length;
        question.sentence2WithGap = el.value.slice(0, s) + GAP + el.value.slice(e);
        requestAnimationFrame(() => {
            el.focus();
            el.selectionStart = el.selectionEnd = s + GAP.length;
        });
    }

    /** Retrieves the sentence2 textarea by index and delegates to {@link insertGap}. */
    function handleInsertGap() {
        const el = document.getElementById(`s2-${index}`);
        if (el instanceof HTMLTextAreaElement) insertGap(el);
    }

    /** Appends a trimmed non-empty string to the alternative answers list. */
    function addAltAnswer() {
        const val = newAltAnswer.trim();
        if (val) {
            question.alternativeAnswers.push(val);
            newAltAnswer = '';
        }
    }

    /** Appends a trimmed non-empty string to the wrong answers list. */
    function addWrongAnswer() {
        const val = newWrongAnswer.trim();
        if (val) {
            question.exampleWrongAnswers.push(val);
            newWrongAnswer = '';
        }
    }

    /**
     * Handles Enter key in the "add answer" inputs.
     *
     * @param e - Keyboard event.
     * @param handler - The add function to call on Enter.
     */
    function onAnswerKeydown(e: KeyboardEvent, handler: () => void) {
        if (e.key === 'Enter') {
            e.preventDefault();
            handler();
        }
    }

    /**
     * Clamps a numeric input value to the given min/max range and writes it
     * back to the question field.
     *
     * @param e - Native input event from a number input.
     * @param field - Which question field to update ('minWords' | 'maxWords').
     * @param lo - Minimum allowed value.
     * @param hi - Maximum allowed value.
     */
    function onWordCountInput(
        e: Event,
        field: 'minWords' | 'maxWords',
        lo: number,
        hi: number,
    ) {
        const raw = parseInt((e.currentTarget as HTMLInputElement).value, 10);
        if (!Number.isFinite(raw)) return;
        question[field] = Math.max(lo, Math.min(hi, raw));
    }

    /**
     * Ensures minWords <= maxWords after the user leaves a word-count input.
     * If the invariant is violated, the *other* field is nudged to match.
     *
     * @param changed - Which field the user just edited.
     */
    function enforceWordCountOrder(changed: 'minWords' | 'maxWords') {
        if (question.minWords > question.maxWords) {
            if (changed === 'minWords') {
                question.maxWords = question.minWords;
            } else {
                question.minWords = question.maxWords;
            }
        }
    }
</script>

<div class="q-card card" class:has-error={error !== null}>
    <div class="q-header">
        <span class="q-num">{t('review.questionNum', {n: index + 1})}</span>
        {#if error}
      <span class="q-err">
        <WarningCircleIcon size={13} weight="bold"/> {error}
      </span>
        {/if}
        <button
                class="btn-danger rm-btn"
                onclick={onRemove}
                aria-label="{t('common.remove')} #{index + 1}"
        >
            <XSquare size={15} weight="bold"/>
        </button>
    </div>

    <!-- Sentence 1 -->
    <label class="field-label" for="s1-{index}">{t('review.sentence1')}</label>
    <textarea
            id="s1-{index}"
            class="text-input"
            rows="2"
            bind:value={question.sentence1}
            placeholder={t('review.sentence1ph')}
            onblur={() => onTouch?.()}
    ></textarea>

    <!-- Keyword -->
    <label class="field-label" for="kw-{index}">{t('review.keyword')}</label>
    <input
            id="kw-{index}"
            class="text-input kw-input"
            type="text"
            value={question.keyword}
            oninput={onKeywordInput}
            placeholder={t('review.keywordph')}
            onblur={() => onTouch?.()}
    />

    <!-- Sentence 2 -->
    <label class="field-label" for="s2-{index}">
        {t('review.sentence2')}
        <span class="gap-hint">— wpisz <code>_</code> żeby wstawić lukę</span>
    </label>
    <div class="s2-wrap">
    <textarea
            id="s2-{index}"
            class="text-input gap-textarea"
            rows="2"
            value={question.sentence2WithGap}
            oninput={onGapInput}
            placeholder={t('review.sentence2ph')}
            onblur={() => onTouch?.()}
    ></textarea>
        <button
                type="button"
                class="btn-ghost insert-gap-btn"
                class:hidden={question.sentence2WithGap.includes(CANONICAL_GAP)}
                onclick={handleInsertGap}
                title="Wstaw ______ w miejscu kursora"
        >+ ______
        </button>
    </div>

    <!-- Primary answer + word range -->
    <div class="bottom-row">
        <div class="answer-field">
            <label class="field-label" for="ans-{index}">{t('review.answer')}</label>
            <input
                    id="ans-{index}"
                    class="text-input"
                    type="text"
                    bind:value={question.correctAnswer}
                    placeholder={t('review.answerph')}
                    onblur={() => onTouch?.()}
            />
        </div>

        <!-- Word range: two small number spinners side by side -->
        <div class="word-range-field">
            <span class="field-label">{t('review.wordRange')}</span>
            <div class="word-range-inputs">
                <label class="sr-only" for="mw-min-{index}">{t('review.minWordsLabel')}</label>
                <input
                        id="mw-min-{index}"
                        class="text-input word-count-input"
                        type="number"
                        min="1"
                        max="10"
                        value={question.minWords}
                        oninput={(e) => onWordCountInput(e, 'minWords', 1, 10)}
                        onblur={() => { enforceWordCountOrder('minWords'); onTouch?.(); }}
                        title={t('review.minWordsLabel')}
                />
                <span class="range-sep" aria-hidden="true">–</span>
                <label class="sr-only" for="mw-max-{index}">{t('review.maxWordsLabel')}</label>
                <input
                        id="mw-max-{index}"
                        class="text-input word-count-input"
                        type="number"
                        min="1"
                        max="10"
                        value={question.maxWords}
                        oninput={(e) => onWordCountInput(e, 'maxWords', 1, 10)}
                        onblur={() => { enforceWordCountOrder('maxWords'); onTouch?.(); }}
                        title={t('review.maxWordsLabel')}
                />
                <span class="range-unit">wyrazów</span>
            </div>
        </div>
    </div>

    <!-- Alternative correct answers -->
    <div class="answers-block">
        <span class="field-label">{t('review.alternativeAnswers')}</span>
        {#if question.alternativeAnswers.length > 0}
            <div class="chip-list">
                {#each question.alternativeAnswers as ans, i}
          <span class="chip chip-ok">
            {ans}
              <button
                      class="chip-rm"
                      type="button"
                      aria-label="{t('common.remove')} {ans}"
                      onclick={() => question.alternativeAnswers.splice(i, 1)}
              ><XSquare size={11} weight="bold"/></button>
          </span>
                {/each}
            </div>
        {/if}
        <div class="add-answer-row">
            <input
                    class="text-input add-input"
                    type="text"
                    bind:value={newAltAnswer}
                    placeholder={t('review.altAnswerPh')}
                    onkeydown={(e) => onAnswerKeydown(e, addAltAnswer)}
                    onblur={() => onTouch?.()}
            />
            <button type="button" class="btn-ghost add-chip-btn" onclick={addAltAnswer}>
                <PlusIcon size={13} weight="bold"/> {t('review.addAnswerBtn')}
            </button>
        </div>
    </div>

    <!-- Example wrong answers -->
    <div class="answers-block">
        <span class="field-label">{t('review.exampleWrongAnswers')}</span>
        {#if question.exampleWrongAnswers.length > 0}
            <div class="chip-list">
                {#each question.exampleWrongAnswers as ans, i}
          <span class="chip chip-err">
            {ans}
              <button
                      class="chip-rm"
                      type="button"
                      aria-label="{t('common.remove')} {ans}"
                      onclick={() => question.exampleWrongAnswers.splice(i, 1)}
              ><XSquare size={11} weight="bold"/></button>
          </span>
                {/each}
            </div>
        {/if}
        <div class="add-answer-row">
            <input
                    class="text-input add-input"
                    type="text"
                    bind:value={newWrongAnswer}
                    placeholder={t('review.wrongAnswerPh')}
                    onkeydown={(e) => onAnswerKeydown(e, addWrongAnswer)}
                    onblur={() => onTouch?.()}
            />
            <button type="button" class="btn-ghost add-chip-btn" onclick={addWrongAnswer}>
                <PlusIcon size={13} weight="bold"/> {t('review.addAnswerBtn')}
            </button>
        </div>
    </div>
</div>

<style>
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
        gap: var(--space-3);
    }

    .q-num {
        font-weight: var(--font-weight-bold);
        color: var(--color-primary);
        font-size: var(--font-size-sm);
    }

    .q-err {
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
        font-size: var(--font-size-xs);
        margin-left: auto;
    }

    .kw-input {
        font-weight: var(--font-weight-bold);
        letter-spacing: var(--letter-spacing-wide);
        max-width: 200px;
        resize: none;
    }

    .gap-hint {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-normal);
        color: var(--color-text-muted);
        text-transform: none;
        letter-spacing: 0;
        margin-left: var(--space-2);
    }

    .gap-hint code {
        font-family: var(--font-mono), monospace;
        background: var(--color-neutral-200);
        padding: 0 3px;
        border-radius: 3px;
    }

    .gap-textarea {
        font-family: var(--font-mono), monospace;
        letter-spacing: -0.03em;
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

    .bottom-row {
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

    /* ── Word range inputs ────────────────────────────────────────────── */
    .word-range-field {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        flex-shrink: 0;
    }

    .word-range-inputs {
        display: flex;
        align-items: center;
        gap: var(--space-2);
    }

    .word-count-input {
        width: 56px;
        text-align: center;
        padding: var(--space-2) var(--space-1);
        /* hide browser spinner arrows — we rely on direct typing */
        appearance: textfield;
        -moz-appearance: textfield;
    }

    .word-count-input::-webkit-outer-spin-button,
    .word-count-input::-webkit-inner-spin-button {
        -webkit-appearance: none;
        margin: 0;
    }

    .range-sep {
        font-weight: var(--font-weight-bold);
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
    }

    .range-unit {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        white-space: nowrap;
    }

    /* ── Visually hidden label (accessible) ──────────────────────────── */
    .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
    }

    /* ── Answer chip lists ────────────────────────────────────────────── */
    .answers-block {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        background: var(--color-neutral-100);
        border-radius: var(--radius-md);
    }

    .chip-list {
        display: flex;
        flex-wrap: wrap;
        gap: var(--space-2);
    }

    .chip {
        display: inline-flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-1) var(--space-2);
        border-radius: var(--radius-full);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
    }

    .chip-ok {
        background: var(--color-success-light);
        color: var(--color-success-dark);
    }

    .chip-err {
        background: var(--color-danger-light);
        color: var(--color-danger-dark);
    }

    .chip-rm {
        background: none;
        border: none;
        padding: 0;
        cursor: pointer;
        display: flex;
        align-items: center;
        color: inherit;
        opacity: 0.7;
        border-radius: 0;
    }

    .chip-rm:hover {
        opacity: 1;
    }

    .chip-rm:active {
        transform: none;
    }

    .add-answer-row {
        display: flex;
        gap: var(--space-2);
        align-items: center;
    }

    .add-input {
        flex: 1;
        font-size: var(--font-size-sm);
        padding: var(--space-1) var(--space-2);
    }

    .add-chip-btn {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-1) var(--space-3);
        font-size: var(--font-size-xs);
        white-space: nowrap;
        flex-shrink: 0;
    }

    .insert-gap-btn.hidden {
        visibility: hidden;
        pointer-events: none;
    }
</style>