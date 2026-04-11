<script lang="ts">
    import {t} from '$lib/i18n.svelte.js';
    import type {PageData} from './$types.js';
    import type {ExerciseType} from '$lib/constants.js';
    import {EXERCISE_TYPES} from '$lib/constants.js';
    import {ArrowRightIcon, LinkIcon, PencilSimpleIcon} from 'phosphor-svelte';

    let {data} = $props<{ data: PageData }>();

    /** Slug of the set whose link was just copied — used to show feedback. */
    let copiedSlug = $state<string | null>(null);

    /**
     * Copies the shareable URL for a set to the clipboard and briefly
     * shows a confirmation on the button.
     *
     * @param slug - The set's slug.
     */
    async function copyLink(slug: string) {
        const url = `${window.location.origin}/set/${slug}`;
        await navigator.clipboard.writeText(url);
        copiedSlug = slug;
        setTimeout(() => {
            copiedSlug = null;
        }, 2000);
    }

    /**
     * Returns the translated label for an exercise type.
     *
     * @param type - Exercise type key.
     * @returns Translated display string.
     */
    function typeLabel(type: ExerciseType): string {
        return t(`exerciseType.${type}`);
    }

    /**
     * Returns true when a given type has at least one public set.
     *
     * @param type - Exercise type key.
     */
    function hasAny(type: ExerciseType): boolean {
        return (data.setsByType[type]?.length ?? 0) > 0;
    }

    const anyPublicSets = $derived(EXERCISE_TYPES.some(hasAny));

    /** Human-readable descriptions shown in the exercise type pills on the hero. */
    const TYPE_DESCRIPTIONS: Record<ExerciseType, string> = {
        kwt: 'Transformacje słów kluczowych',
        grammar: 'Uzupełnianie zdań',
        translation: 'Tłumaczenie fragmentów',
    };
</script>

<svelte:head>
    <title>angmatura — maturalne zadania z angielskiego</title>
</svelte:head>

<div class="home">

    <!-- ── Hero ────────────────────────────────────────────────────────── -->
    <section class="hero">
        <div class="hero-text">
            <h1 class="hero-title">Maturalne zadania<br>z angielskiego</h1>
            <p class="hero-sub">
                Rozwiązuj zestawy z transformacji słów kluczowych, gramatykalizacji
                i tłumaczeń — wszystkie typy zadań z angielskiego na poziomie rozszerzonym.
            </p>
        </div>

        <div class="type-pills">
            {#each EXERCISE_TYPES as type}
                <div class="type-pill">
                    <span class="pill-badge">{typeLabel(type)}</span>
                    <span class="pill-desc">{TYPE_DESCRIPTIONS[type]}</span>
                </div>
            {/each}
        </div>

        <div class="hero-cta">
            <a href="/create/manual" class="btn-primary cta-btn">
                <PencilSimpleIcon size={18} weight="regular"/>
                Utwórz własny zestaw
            </a>
        </div>
    </section>

    <!-- ── Sets listing ─────────────────────────────────────────────────── -->
    <section class="sets-section">
        <h2 class="section-title">{t('home.setsTitle')}</h2>

        {#if !anyPublicSets}
            <div class="no-sets card">
                <p>Nie ma jeszcze żadnych zestawów do rozwiązania.</p>
                <p class="no-sets-sub">Możesz stworzyć własny zestaw i podzielić się nim przez link.</p>
            </div>
        {:else}
            {#each EXERCISE_TYPES as type}
                {#if hasAny(type)}
                    <div class="type-section">
                        <h3 class="type-heading">
                            <span class="type-badge">{typeLabel(type)}</span>
                            <span class="type-desc">{TYPE_DESCRIPTIONS[type]}</span>
                        </h3>
                        <div class="sets-grid">
                            {#each data.setsByType[type] as s (s.slug)}
                                <div class="set-card card">
                                    {#if s.sourceLabel}
                                        <span class="source-badge">{s.sourceLabel}</span>
                                    {/if}
                                    <strong class="set-title">{s.title}</strong>
                                    <span class="set-meta">{t('home.questionsCount', {n: s.questionCount})}</span>
                                    <div class="set-actions">
                                        <a href="/set/{s.slug}" class="solve-link">
                                            {t('home.solveNow')}
                                            <ArrowRightIcon size={14} weight="bold"/>
                                        </a>
                                        <button
                                                class="copy-btn"
                                                onclick={() => copyLink(s.slug)}
                                                title="Skopiuj link do udostępnienia"
                                                aria-label="Skopiuj link do zestawu {s.title}"
                                        >
                                            {#if copiedSlug === s.slug}
                                                <span class="copied-label">Skopiowano!</span>
                                            {:else}
                                                <LinkIcon size={14} weight="bold"/>
                                            {/if}
                                        </button>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/if}
            {/each}
        {/if}
    </section>

</div>

<style>
    .home {
        display: flex;
        flex-direction: column;
        gap: var(--space-12);
    }

    /* ── Hero ─────────────────────────────────────────────────────────── */
    .hero {
        display: flex;
        flex-direction: column;
        gap: var(--space-8);
        padding: var(--space-8) 0 0;
    }

    .hero-title {
        font-size: var(--font-size-hero);
        font-weight: var(--font-weight-black);
        line-height: var(--line-height-tight);
        letter-spacing: var(--letter-spacing-tight);
    }

    .hero-sub {
        font-size: var(--font-size-md);
        color: var(--color-text-muted);
        max-width: 520px;
        line-height: var(--line-height-base);
        margin-top: var(--space-3);
    }

    /* ── Exercise type pills ──────────────────────────────────────────── */
    .type-pills {
        display: flex;
        gap: var(--space-3);
        flex-wrap: wrap;
    }

    .type-pill {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        background: var(--color-surface);
        border: 1px solid var(--color-border);
        border-radius: var(--radius-full);
        padding: var(--space-2) var(--space-4);
        box-shadow: var(--shadow-sm);
    }

    .pill-badge {
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-black);
        color: var(--color-primary);
        letter-spacing: var(--letter-spacing-wide);
        text-transform: uppercase;
    }

    .pill-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
    }

    /* ── Hero CTA ─────────────────────────────────────────────────────── */
    .hero-cta {
        display: flex;
        gap: var(--space-3);
        align-items: center;
    }

    .cta-btn {
        display: inline-flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-3) var(--space-6);
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-semibold);
        border-radius: var(--radius-lg);
        text-decoration: none;
        transition: background var(--transition-base), transform var(--transition-fast);
    }

    .cta-btn:hover {
        text-decoration: none;
        transform: translateY(-1px);
    }

    /* ── Section shared ───────────────────────────────────────────────── */
    .section-title {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-extrabold);
        margin-bottom: var(--space-6);
    }

    /* ── Sets section ─────────────────────────────────────────────────── */
    .sets-section {
        display: flex;
        flex-direction: column;
    }

    .type-section {
        margin-bottom: var(--space-8);
    }

    .type-heading {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        margin-bottom: var(--space-4);
    }

    .type-badge {
        background: var(--color-primary);
        color: var(--color-surface);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-bold);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-full);
        letter-spacing: var(--letter-spacing-wide);
        text-transform: uppercase;
        flex-shrink: 0;
    }

    .type-desc {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
    }

    .no-sets {
        text-align: center;
        color: var(--color-text-faint);
        padding: var(--space-8);
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
    }

    .no-sets-sub {
        font-size: var(--font-size-sm);
        color: var(--color-text-faint);
    }

    .sets-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: var(--space-4);
    }

    .set-card {
        display: flex;
        flex-direction: column;
        gap: var(--space-2);
        color: var(--color-text);
        transition: transform var(--transition-base), box-shadow var(--transition-base);
        padding: var(--space-5);
    }

    .set-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
    }

    .source-badge {
        display: inline-block;
        align-self: flex-start;
        background: var(--color-primary-muted);
        color: var(--color-primary);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-bold);
        padding: 2px var(--space-2);
        border-radius: var(--radius-full);
        letter-spacing: var(--letter-spacing-wide);
        text-transform: uppercase;
    }

    .set-title {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-bold);
        line-height: var(--line-height-snug);
        flex: 1;
    }

    .set-meta {
        font-size: var(--font-size-xs);
        color: var(--color-text-muted);
    }

    .set-actions {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-top: var(--space-1);
    }

    .solve-link {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-semibold);
        color: var(--color-primary);
        text-decoration: none;
    }

    .solve-link:hover {
        text-decoration: underline;
    }

    .copy-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 28px;
        height: 28px;
        padding: 0 var(--space-2);
        background: var(--color-neutral-100);
        color: var(--color-text-muted);
        border: none;
        border-radius: var(--radius-md);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        cursor: pointer;
        transition: background var(--transition-base), color var(--transition-base);
    }

    .copy-btn:hover {
        background: var(--color-primary-light);
        color: var(--color-primary);
    }

    .copy-btn:active {
        transform: scale(0.95);
    }

    .copied-label {
        color: var(--color-success-dark);
        white-space: nowrap;
    }

    @media (max-width: 600px) {
        .hero-title {
            font-size: var(--font-size-3xl);
        }

        .type-pill {
            flex-direction: column;
            align-items: flex-start;
            gap: var(--space-1);
            border-radius: var(--radius-lg);
            padding: var(--space-3);
        }
    }
</style>