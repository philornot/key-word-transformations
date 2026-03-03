<script lang="ts">
    /**
     * @fileoverview Reusable answer chip block used inside KwtQuestionEditor.
     *
     * Renders a labelled section with:
     *   - a list of removable answer chips
     *   - a single-input row for adding answers one by one
     *   - a collapsible import panel for bulk-pasting semicolon-delimited lists
     */

    import {PlusIcon, XSquare} from 'phosphor-svelte';
    import {parseAnswerList} from '$lib/parseAnswerList.js';

    interface Props {
        /** The answer array to display and mutate (bound by reference). */
        answers: string[];
        /** Section label shown above the chips. */
        label: string;
        /** Identifies this block; used for the import panel toggle ('alt' | 'wrong'). */
        variant: 'alt' | 'wrong';
        /** Placeholder text for the single-add input. */
        addPlaceholder: string;
        /** Placeholder text for the bulk-import textarea. */
        importPlaceholder: string;
        /** Colour theme for chips: 'ok' = green, 'err' = red. */
        chipVariant: 'ok' | 'err';
        /** Called whenever the answers array is mutated. */
        onTouch?: () => void;
    }

    let {
        answers = $bindable(),
        label,
        variant,
        addPlaceholder,
        importPlaceholder,
        chipVariant,
        onTouch,
    }: Props = $props();

    let newAnswer = $state('');
    let isImportOpen = $state(false);
    let importText = $state('');

    /** Appends a trimmed non-empty string to the answers array. */
    function addAnswer(): void {
        const val = newAnswer.trim();
        if (!val) return;
        answers.push(val);
        newAnswer = '';
        onTouch?.();
    }

    /**
     * Adds an answer when Enter is pressed in the single-add input.
     *
     * @param e - Keyboard event.
     */
    function onKeydown(e: KeyboardEvent): void {
        if (e.key === 'Enter') {
            e.preventDefault();
            addAnswer();
        }
    }

    /**
     * Parses the import textarea and appends all found answers, then closes
     * the panel.
     */
    function applyImport(): void {
        const parsed = parseAnswerList(importText);
        if (!parsed.length) return;
        answers.push(...parsed);
        importText = '';
        isImportOpen = false;
        onTouch?.();
    }

    /** Toggles the import panel, resetting textarea on open. */
    function toggleImport(): void {
        isImportOpen = !isImportOpen;
        if (isImportOpen) importText = '';
    }
</script>

<div class="answers-block">
    <div class="block-header">
        <span class="field-label">{label}</span>
        <button
                type="button"
                class="btn-ghost import-toggle-btn"
                class:import-toggle-active={isImportOpen}
                onclick={toggleImport}
                title="Importuj listę odpowiedzi z tekstu"
        >
            {isImportOpen ? '✕ Anuluj' : '↓ Importuj'}
        </button>
    </div>

    {#if isImportOpen}
        <div class="import-panel">
            <p class="import-hint">
                Wklej tekst ze średnikami. Łamanie wierszy jest ignorowane —
                <code>had lost\ncontact with</code> staje się jedną odpowiedzią.
            </p>
            <textarea
                    class="text-input import-textarea"
                    bind:value={importText}
                    rows="3"
                    placeholder={importPlaceholder}
            ></textarea>
            <div class="import-actions">
                <button
                        type="button"
                        class="btn-primary import-apply-btn"
                        onclick={applyImport}
                        disabled={!importText.trim()}
                >
                    Importuj
                </button>
            </div>
        </div>
    {/if}

    {#if answers.length > 0}
        <div class="chip-list">
            {#each answers as ans, i}
                <span class="chip" class:chip-ok={chipVariant === 'ok'} class:chip-err={chipVariant === 'err'}>
                    {ans}
                    <button
                            class="chip-rm"
                            type="button"
                            aria-label="Usuń {ans}"
                            onclick={() => { answers.splice(i, 1); onTouch?.(); }}
                    >
                        <XSquare size={11} weight="bold"/>
                    </button>
                </span>
            {/each}
        </div>
    {/if}

    <div class="add-row">
        <input
                class="text-input add-input"
                type="text"
                bind:value={newAnswer}
                placeholder={addPlaceholder}
                onkeydown={onKeydown}
                onblur={() => onTouch?.()}
        />
        <button type="button" class="btn-ghost add-chip-btn" onclick={addAnswer}>
            <PlusIcon size={13} weight="bold"/>
            Dodaj
        </button>
    </div>
</div>

<style>
    .answers-block {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        background: var(--color-neutral-100);
        border-radius: var(--radius-md);
    }

    .block-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-2);
    }

    .block-header .field-label {
        margin-bottom: 0;
    }

    .import-toggle-btn {
        padding: var(--space-1) var(--space-2);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        flex-shrink: 0;
    }

    .import-toggle-active {
        background: var(--color-primary-light);
        border-color: var(--color-primary);
    }

    /* ── Import panel ─────────────────────────────────────────────────── */
    .import-panel {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        padding: var(--space-3);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-md);
    }

    .import-hint {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
        line-height: var(--line-height-snug);
    }

    .import-hint code {
        font-family: var(--font-mono), monospace;
        background: var(--color-neutral-200);
        padding: 0 3px;
        border-radius: 3px;
    }

    .import-textarea {
        font-size: var(--font-size-sm);
        resize: vertical;
        min-height: 64px;
    }

    .import-actions {
        display: flex;
        gap: var(--space-2);
    }

    .import-apply-btn {
        padding: var(--space-1) var(--space-3);
        font-size: var(--font-size-xs);
    }

    /* ── Chips ────────────────────────────────────────────────────────── */
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

    /* ── Add row ──────────────────────────────────────────────────────── */
    .add-row {
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
</style>