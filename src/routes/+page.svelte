<script lang="ts">
    import {t} from '$lib/i18n.svelte.js';
    import {Camera, MagnifyingGlass, PencilSimple, RocketLaunch, Upload} from 'phosphor-svelte';
</script>

<svelte:head>
    <title>Key word transformations</title>
</svelte:head>

<div class="home">
    <!-- Hero -->
    <section class="hero">
        <h1 class="hero-title">{t('home.title')}</h1>
        <p class="hero-sub">{t('home.subtitle')}</p>

        <div class="cta-row">
            <a href="/create/scan" class="cta-card cta-primary">
                <Camera size={28} weight="duotone"/>
                <div>
                    <strong>{t('home.scanTitle')}</strong>
                    <span>{t('home.scanDesc')}</span>
                </div>
            </a>
            <a href="/create/manual" class="cta-card cta-ghost">
                <PencilSimple size={28} weight="duotone"/>
                <div>
                    <strong>{t('home.manualTitle')}</strong>
                    <span>{t('home.manualDesc')}</span>
                </div>
            </a>
        </div>
    </section>

    <!-- How it works -->
    <section class="how">
        <h2 class="how-title">{t('home.howItWorks')}</h2>
        <div class="steps">
            <div class="step card">
                <div class="step-icon">
                    <Upload size={24} weight="duotone"/>
                </div>
                <div class="step-num">1</div>
                <strong>{t('home.step1')}</strong>
                <p>{t('home.step1desc')}</p>
            </div>
            <div class="step-arrow">→</div>
            <div class="step card">
                <div class="step-icon">
                    <MagnifyingGlass size={24} weight="duotone"/>
                </div>
                <div class="step-num">2</div>
                <strong>{t('home.step2')}</strong>
                <p>{t('home.step2desc')}</p>
            </div>
            <div class="step-arrow">→</div>
            <div class="step card">
                <div class="step-icon">
                    <RocketLaunch size={24} weight="duotone"/>
                </div>
                <div class="step-num">3</div>
                <strong>{t('home.step3')}</strong>
                <p>{t('home.step3desc')}</p>
            </div>
        </div>
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
        text-align: center;
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: var(--space-5);
        padding: var(--space-8) 0;
    }

    .hero-title {
        font-size: var(--font-size-hero);
        font-weight: var(--font-weight-black);
        line-height: var(--line-height-tight);
        letter-spacing: var(--letter-spacing-tight);
        color: var(--color-text);
        max-width: 700px;
    }

    .hero-sub {
        font-size: var(--font-size-lg);
        color: var(--color-text-muted);
        max-width: 560px;
        line-height: var(--line-height-base);
    }

    /* ── CTA cards ────────────────────────────────────────────────────── */
    .cta-row {
        display: flex;
        gap: var(--space-4);
        flex-wrap: wrap;
        justify-content: center;
        width: 100%;
        max-width: 620px;
        margin-top: var(--space-3);
    }

    .cta-card {
        flex: 1;
        min-width: 240px;
        display: flex;
        align-items: center;
        gap: var(--space-4);
        padding: var(--space-5) var(--space-6);
        border-radius: var(--radius-xl);
        text-decoration: none;
        transition: transform var(--transition-base), box-shadow var(--transition-base);
    }

    .cta-card:hover {
        transform: translateY(-2px);
        text-decoration: none;
        box-shadow: var(--shadow-lg);
    }

    .cta-primary {
        background: var(--color-primary);
        color: var(--color-surface);
        box-shadow: var(--shadow-md);
    }

    .cta-ghost {
        background: var(--color-surface);
        color: var(--color-text);
        border: 2px solid var(--color-border);
        box-shadow: var(--shadow-sm);
    }

    .cta-card div {
        display: flex;
        flex-direction: column;
        gap: var(--space-1);
        text-align: left;
    }

    .cta-primary strong {
        color: var(--color-surface);
        font-size: var(--font-size-base);
    }

    .cta-primary span {
        color: rgba(255, 255, 255, 0.78);
        font-size: var(--font-size-sm);
    }

    .cta-ghost strong {
        color: var(--color-text);
        font-size: var(--font-size-base);
    }

    .cta-ghost span {
        color: var(--color-text-muted);
        font-size: var(--font-size-sm);
    }

    /* ── How it works ─────────────────────────────────────────────────── */
    .how {
        display: flex;
        flex-direction: column;
        gap: var(--space-6);
    }

    .how-title {
        font-size: var(--font-size-2xl);
        font-weight: var(--font-weight-extrabold);
        text-align: center;
    }

    .steps {
        display: flex;
        align-items: center;
        gap: var(--space-3);
        flex-wrap: wrap;
        justify-content: center;
    }

    .step {
        flex: 1;
        min-width: 180px;
        max-width: 220px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        gap: var(--space-2);
        padding: var(--space-6) var(--space-5);
        position: relative;
    }

    .step-icon {
        color: var(--color-primary);
    }

    .step-num {
        position: absolute;
        top: var(--space-3);
        right: var(--space-3);
        background: var(--color-primary-muted);
        color: var(--color-primary);
        font-size: var(--font-size-xs);
        font-weight: var(--font-weight-black);
        width: 20px;
        height: 20px;
        border-radius: var(--radius-full);
        display: flex;
        align-items: center;
        justify-content: center;
    }

    .step strong {
        font-size: var(--font-size-base);
        font-weight: var(--font-weight-bold);
    }

    .step p {
        font-size: var(--font-size-sm);
        color: var(--color-text-muted);
        line-height: var(--line-height-snug);
    }

    .step-arrow {
        font-size: var(--font-size-xl);
        color: var(--color-neutral-400);
        flex-shrink: 0;
    }

    @media (max-width: 600px) {
        .hero-title {
            font-size: var(--font-size-3xl);
        }

        .step-arrow {
            transform: rotate(90deg);
        }

        .steps {
            flex-direction: column;
            align-items: stretch;
        }

        .step {
            max-width: 100%;
            flex-direction: row;
            text-align: left;
        }

        .step-icon {
            flex-shrink: 0;
        }
    }
</style>