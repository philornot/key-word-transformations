<script lang="ts">
    import '$lib/theme.css';
    import '$lib/global.css';
    import {locale, t} from '$lib/i18n.svelte.js';
    import {page} from '$app/stores';
    import {Camera, SignOut, Translate} from 'phosphor-svelte';
    import type {ExerciseType} from '$lib/constants.js';

    let {children, data} = $props();

    function toggleLang() {
        locale.lang = locale.lang === 'pl' ? 'en' : 'pl';
    }

    /** The exercise type currently selected via the URL search param, if any. */
    const activeType = $derived(
        ($page.url.pathname.startsWith('/create/manual')
            ? ($page.url.searchParams.get('type') ?? 'kwt')
            : null) as ExerciseType | null,
    );

    const typeLinks: Array<{ type: ExerciseType; label: string }> = [
        {type: 'kwt', label: 'KWT'},
        {type: 'grammar', label: t('exerciseType.grammar')},
        {type: 'translation', label: t('exerciseType.translation')},
    ];
</script>

<div class="shell">
    <header class="header">
        <a href="/" class="logo">{t('nav.home')}</a>
        <nav class="nav">
            <a href="/create/scan" class="nav-link">
                <Camera size={16} weight="regular"/>{t('nav.scan')}
                <span class="beta-badge">{t('common.beta')}</span>
            </a>

            <!-- Exercise-type creation tabs -->
            <div class="type-group" role="group" aria-label="Exercise type">
                {#each typeLinks as link}
                    <a
                            href="/create/manual?type={link.type}"
                            class="type-tab"
                            class:active={activeType === link.type}
                            aria-current={activeType === link.type ? 'page' : undefined}
                    >{link.label}</a>
                {/each}
            </div>

            <button class="lang-btn" onclick={toggleLang} aria-label="Toggle language">
                <Translate size={14} weight="bold"/>{t('common.langToggle')}
            </button>
            {#if data.isAdmin}
                <a href="/admin" class="nav-link">Panel</a>
                <form method="POST" action="/admin?/logout">
                    <button class="logout-btn" type="submit">
                        <SignOut size={14} weight="bold"/>
                        Wyloguj
                    </button>
                </form>
            {/if}
        </nav>
    </header>

    <main class="content">
        {@render children()}
    </main>

    <footer class="footer">
        <p>Key word transformations</p>
    </footer>
</div>


<style>
    .shell {
        min-height: 100vh;
        display: flex;
        flex-direction: column;
    }

    .header {
        background: var(--color-surface);
        border-bottom: 1px solid var(--color-border-subtle);
        padding: var(--space-3) var(--space-6);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: var(--space-4);
        flex-wrap: wrap;
    }

    .logo {
        font-size: var(--font-size-xl);
        font-weight: var(--font-weight-extrabold);
        color: var(--color-text);
        white-space: nowrap;
    }

    .nav {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        flex-wrap: wrap;
    }

    .nav-link {
        display: flex;
        align-items: center;
        gap: var(--space-2);
        padding: var(--space-2) var(--space-3);
        border-radius: var(--radius-md);
        font-size: var(--font-size-sm);
        font-weight: var(--font-weight-medium);
        color: var(--color-text-muted);
        transition: background var(--transition-base), color var(--transition-base);
        white-space: nowrap;
    }

    .nav-link:hover {
        background: var(--color-neutral-100);
        color: var(--color-text);
        text-decoration: none;
    }

    .beta-badge {
        background: var(--color-warning);
        color: #fff;
        font-size: 0.6rem;
        font-weight: var(--font-weight-black);
        letter-spacing: var(--letter-spacing-wider);
        padding: 1px 5px;
        border-radius: var(--radius-full);
        line-height: 1.4;
        vertical-align: middle;
    }

    /* ── Exercise-type tab group ─────────────────────────────────────── */
    .type-group {
        display: flex;
        align-items: stretch;
        border: 2px solid var(--color-primary);
        border-radius: var(--radius-md);
        overflow: hidden;
    }

    .type-tab {
        display: flex;
        align-items: center;
        padding: var(--space-1) var(--space-3);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-semibold);
        color: var(--color-primary);
        background: transparent;
        text-decoration: none;
        white-space: nowrap;
        transition: background var(--transition-base), color var(--transition-base);
        border-right: 1px solid var(--color-primary-muted);
    }

    .type-tab:last-child {
        border-right: none;
    }

    .type-tab:hover {
        background: var(--color-primary-light);
        text-decoration: none;
    }

    .type-tab.active {
        background: var(--color-primary);
        color: var(--color-surface);
    }

    /* ── Utilities ───────────────────────────────────────────────────── */
    .lang-btn {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-bold);
        background: var(--color-neutral-100);
        color: var(--color-text-muted);
        letter-spacing: var(--letter-spacing-wide);
    }

    .lang-btn:hover {
        background: var(--color-neutral-200);
    }

    .content {
        flex: 1;
        padding: var(--space-8) var(--space-6);
        max-width: 860px;
        width: 100%;
        margin: 0 auto;
    }

    .footer {
        text-align: center;
        padding: var(--space-5);
        color: var(--color-text-faint);
        font-size: var(--font-size-xs);
        border-top: 1px solid var(--color-border-subtle);
        background: var(--color-surface);
    }

    .logout-btn {
        display: flex;
        align-items: center;
        gap: var(--space-1);
        padding: var(--space-1) var(--space-3);
        border-radius: var(--radius-sm);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-bold);
        background: var(--color-danger-light);
        color: var(--color-danger-dark);
        letter-spacing: var(--letter-spacing-wide);
        border: none;
    }

    .logout-btn:hover {
        background: var(--color-danger);
        color: white;
    }

    @media (max-width: 640px) {
        .type-group {
            order: 1;
            width: 100%;
        }

        .type-tab {
            flex: 1;
            justify-content: center;
        }
    }
</style>