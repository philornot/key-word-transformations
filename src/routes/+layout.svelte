<script lang="ts">
  import '$lib/theme.css';
  import { t, locale } from '$lib/i18n.svelte.js';

  let { children } = $props();

  function toggleLang() {
    locale.lang = locale.lang === 'pl' ? 'en' : 'pl';
  }
</script>

<div class="shell">
  <header class="header">
    <a href="/" class="logo">{t('nav.home')}</a>
    <nav class="nav">
      <a href="/create/scan"   class="nav-link">📸 {t('nav.scan')}</a>
      <a href="/create/manual" class="nav-link nav-link--primary">✏️ {t('nav.manual')}</a>
      <button class="lang-btn" onclick={toggleLang} aria-label="Toggle language">
        {t('common.langToggle')}
      </button>
    </nav>
  </header>

  <main class="content">
    {@render children()}
  </main>

  <footer class="footer">
    <p>Keyword Transformations</p>
  </footer>
</div>

<style>
  /* ── Global resets & base ─────────────────────────────────────────── */
  :global(*, *::before, *::after) { box-sizing: border-box; margin: 0; padding: 0; }

  :global(body) {
    font-family:      var(--font-sans);
    background:       var(--color-bg);
    color:            var(--color-text);
    line-height:      var(--line-height-base);
    font-size:        var(--font-size-base);
  }

  :global(a) { color: var(--color-primary); text-decoration: none; }
  :global(a:hover) { text-decoration: underline; }

  :global(input[type='text'],
          input[type='radio'],
          textarea,
          select) {
    font-family: var(--font-sans);
    font-size:   var(--font-size-base);
  }

  /* ── Buttons ──────────────────────────────────────────────────────── */
  :global(button) {
    cursor:      pointer;
    font-family: var(--font-sans);
    font-size:   var(--font-size-base);
    border:      none;
    border-radius: var(--radius-md);
    padding:     var(--space-2) var(--space-5);
    transition:  opacity var(--transition-base), transform var(--transition-fast);
  }
  :global(button:active)            { transform: scale(0.98); }
  :global(button:disabled)          { opacity: 0.5; cursor: not-allowed; }

  :global(.btn-primary) {
    background: var(--color-primary);
    color:      var(--color-surface);
  }
  :global(.btn-primary:hover:not(:disabled)) {
    background: var(--color-primary-hover);
  }

  :global(.btn-danger) {
    background: var(--color-danger);
    color:      var(--color-surface);
  }

  :global(.btn-ghost) {
    background:   transparent;
    border:       2px solid var(--color-primary);
    color:        var(--color-primary);
  }
  :global(.btn-ghost:hover:not(:disabled)) {
    background: var(--color-primary-light);
  }

  /* ── Card ─────────────────────────────────────────────────────────── */
  :global(.card) {
    background:    var(--color-surface);
    border-radius: var(--radius-lg);
    padding:       var(--space-6);
    box-shadow:    var(--shadow-md);
  }

  /* ── Form elements ────────────────────────────────────────────────── */
  :global(.field-label) {
    display:         block;
    font-size:       var(--font-size-xs);
    font-weight:     var(--font-weight-bold);
    color:           var(--color-text-muted);
    text-transform:  uppercase;
    letter-spacing:  var(--letter-spacing-wide);
    margin-bottom:   var(--space-1);
  }

  :global(.text-input) {
    width:         100%;
    padding:       var(--space-2) var(--space-3);
    border:        2px solid var(--color-border);
    border-radius: var(--radius-md);
    font-size:     var(--font-size-base);
    outline:       none;
    transition:    border-color var(--transition-base);
    background:    var(--color-surface);
    color:         var(--color-text);
    resize:        vertical;
  }
  :global(.text-input:focus) {
    border-color: var(--color-primary);
  }

  /* ── Feedback ─────────────────────────────────────────────────────── */
  :global(.error-banner) {
    color:         var(--color-danger-dark);
    background:    var(--color-danger-light);
    border:        1px solid var(--color-danger-border);
    border-radius: var(--radius-md);
    padding:       var(--space-3) var(--space-4);
    font-size:     var(--font-size-sm);
  }

  /* ── Spinner ──────────────────────────────────────────────────────── */
  :global(.spinner) {
    width:         1em;
    height:        1em;
    border:        2px solid rgba(255, 255, 255, 0.35);
    border-top-color: var(--color-surface);
    border-radius: var(--radius-full);
    animation:     spin 0.7s linear infinite;
    display:       inline-block;
    vertical-align: middle;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Shell ────────────────────────────────────────────────────────── */
  .shell  { min-height: 100vh; display: flex; flex-direction: column; }

  .header {
    background:    var(--color-surface);
    border-bottom: 1px solid var(--color-border-subtle);
    padding:       var(--space-3) var(--space-6);
    display:       flex;
    align-items:   center;
    justify-content: space-between;
    gap:           var(--space-4);
    flex-wrap:     wrap;
  }

  .logo {
    font-size:   var(--font-size-xl);
    font-weight: var(--font-weight-extrabold);
    color:       var(--color-text);
    white-space: nowrap;
  }

  .nav {
    display:     flex;
    align-items: center;
    gap:         var(--space-2);
    flex-wrap:   wrap;
  }

  .nav-link {
    padding:       var(--space-2) var(--space-3);
    border-radius: var(--radius-md);
    font-size:     var(--font-size-sm);
    font-weight:   var(--font-weight-medium);
    color:         var(--color-text-muted);
    transition:    background var(--transition-base), color var(--transition-base);
    white-space:   nowrap;
  }
  .nav-link:hover { background: var(--color-neutral-100); color: var(--color-text); text-decoration: none; }
  .nav-link--primary { background: var(--color-primary); color: var(--color-surface); font-weight: var(--font-weight-semibold); }
  .nav-link--primary:hover { background: var(--color-primary-hover); color: var(--color-surface); }

  .lang-btn {
    padding:         var(--space-1) var(--space-3);
    border-radius:   var(--radius-sm);
    font-size:       var(--font-size-xs);
    font-weight:     var(--font-weight-bold);
    background:      var(--color-neutral-100);
    color:           var(--color-text-muted);
    letter-spacing:  var(--letter-spacing-wide);
  }
  .lang-btn:hover { background: var(--color-neutral-200); }

  .content {
    flex:       1;
    padding:    var(--space-8) var(--space-6);
    max-width:  860px;
    width:      100%;
    margin:     0 auto;
  }

  .footer {
    text-align:  center;
    padding:     var(--space-5);
    color:       var(--color-text-faint);
    font-size:   var(--font-size-xs);
    border-top:  1px solid var(--color-border-subtle);
    background:  var(--color-surface);
  }
</style>