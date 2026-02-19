# Key word transformations

Aplikacja webowa do tworzenia i rozwiązywania ćwiczeń **Key word transformation** (KWT) w stylu Cambridge B2/C1. Pozwala
wgrać zdjęcie lub PDF z arkuszem ćwiczeń, automatycznie wykryć pytania przez OCR i opublikować
interaktywny test jako link.

## Funkcje

- **Skanowanie OCR** — wgraj JPEG, PNG, WEBP lub PDF; system wykryje pytania automatycznie (Tesseract.js + pdf-parse)
- **Ręczne tworzenie** — edytor krok po kroku bez skanowania
- **Korekta po OCR** — pełny edytor wykrytych pytań przed publikacją
- **Interaktywny test** — wypełnianie luk z walidacją słowa kluczowego
- **Wyniki** — szczegółowy podgląd poprawnych i błędnych odpowiedzi
- **i18n PL/EN** — przełącznik języka w czasie rzeczywistym

## Stack

| Warstwa     | Technologia                           |
|-------------|---------------------------------------|
| Framework   | SvelteKit 2 + Svelte 5                |
| Runtime     | Bun / Node.js                         |
| Baza danych | SQLite (better-sqlite3)               |
| OCR         | Tesseract.js + pdf-parse              |
| Style       | CSS custom properties (design tokens) |

## Wymagania

- Bun ≥ 1.3 lub Node.js ≥ 20
- Nie wymaga zewnętrznych serwisów — baza danych i OCR działają lokalnie

## Instalacja i uruchomienie

```bash
bun install
bun dev        # tryb deweloperski
bun build      # produkcja
bun start      # uruchomienie buildu
```

## Schemat bazy danych

```
sets         — zestaw pytań (slug, title)
questions    — pytania KWT przypisane do zestawu
attempts     — próby rozwiązania testu
answers      — odpowiedzi użytkownika do danej próby
```

## Struktura katalogów

```
src/
  lib/
    components/   # KwtQuestionEditor
    server/       # db, ocr, parser
    i18n.svelte.ts
    store.svelte.ts
    types.ts
  routes/
    api/          # upload, sets, submit
    create/       # scan, manual
    review/
    set/[slug]/
    result/[attemptId]/
```