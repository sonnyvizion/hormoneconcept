# Hormone Concept — Design System

> Référence unique pour construire toute nouvelle section ou composant du thème.
> Boutique : `hormone-concept.myshopify.com` — Thème : `Hormone Concept Custom` (#181101723915)

---

## 1. Principes

- **Éditorial, minimal, premium.** Chaque composant doit paraître conçu, pas assemblé.
- **Le hero est la référence.** Tout nouveau composant s'aligne sur le langage visuel du `video-hero`.
- **Scramble = signature.** Tout CTA interactif hérite de l'effet scramble.
- **Fluidité via `clamp()`.** Pas de breakpoints inutiles — les valeurs s'étirent entre mobile et desktop.
- **GPU-first.** Les animations ne touchent que `transform` et `opacity`.

---

## 2. Tokens de couleur

```css
/* Palette globale (:root) */
--bg:          #D8DBDD   /* Fond principal — gris clair */
--paper:       #f4f5f7   /* Fond secondaire — blanc cassé */
--text:        #111824   /* Texte principal — quasi noir */
--muted:       #5c6471   /* Texte secondaire — gris moyen */
--accent:      #d35f34   /* Accent — orange rouille */
--accent-dark: #a84622   /* Accent sombre */
--line:        #d8dde5   /* Bordures fines */
--radius:      14px      /* Border-radius standard */
```

### Couleurs par contexte

| Contexte | Valeur | Usage |
|---|---|---|
| Header bg | `rgba(246, 247, 249, .95)` | Shell translucide au scroll |
| Header border | `rgba(232, 240, 249, .42)` | Stroke extérieur |
| Section stroke | `rgba(232, 240, 249, .42)` | `--hero-shell-stroke` |
| Section inner stroke | `rgba(232, 240, 249, .18)` | `--hero-shell-inner-stroke` |
| Card dark bg | `#121A25` | Fond des cards trio/duo |
| Slider bg | `#E9EBEB` | Fond section slider |
| Slider cell bg | `#D8DBDD` | Fond zone produits |
| Ticker/meta bg | `#EFF0F0` | Fond badges et meta |

---

## 3. Typographie

### Polices

| Rôle | Famille | Fallbacks |
|---|---|---|
| **Body / UI** | IBM Plex Mono | SFMono-Regular, Consolas, Menlo, monospace |
| **Titres** | Space Grotesk | Helvetica Neue, Arial, sans-serif |

```css
/* Body — monospace par défaut */
font-family: "IBM Plex Mono", "SFMono-Regular", Consolas, monospace;
font-variant-numeric: lining-nums tabular-nums;

/* Titres h1, h2, h3 */
font-family: "Space Grotesk", "Helvetica Neue", Arial, sans-serif;
font-variant-numeric: normal;
```

### Règles typographiques

- Les labels, CTA et tags sont toujours en **MAJUSCULES**.
- Les titres hero : `3vw` base desktop, fluide.
- Pas d'échelle typographique centralisée — chaque composant définit sa propre taille avec `clamp()`.
- `letter-spacing` élevé sur tous les textes UI en caps.
- Jamais de retour à la ligne sur les CTA interactifs : `white-space: nowrap`.

---

## 4. Espacement & layout

### Variables de layout

```css
--hero-shell-inset:         clamp(14px, 1.6vw, 20px)    /* Padding horizontal shells */
--site-header-shell-padding: clamp(12px, 1.2vw, 16px)    /* Padding interne header */
--section-rail-gap:         clamp(8px, .9vw, 12px)       /* Gap vertical entre sections */
--site-header-height:       58px                          /* Hauteur header fixe */
--site-header-gap:          18px                          /* Espace header→contenu */
```

### Unités utilisées

| Type | Valeur type | Contexte |
|---|---|---|
| Gap sections | `clamp(8px, .9vw, 12px)` | `--section-rail-gap` |
| Inset intérieur | `clamp(14px, 1.6vw, 20px)` | Shells, frames |
| Trait / séparateur | `1–2px` | Grids, bordures |
| Hauteur card slider | `280–520px` | Configurable par section |
| Largeur card slider | `180–340px` | Configurable par section |

### Grilles

- **Header** : 3 colonnes `auto / 1fr / auto` (menu / logo / actions)
- **Trio showcase** : `1.12fr 1fr` × `1fr .58fr` (primary large gauche, 2 slots droite)
- **Duo showcase** : `repeat(2, 1fr)` × `1fr` (deux colonnes égales)
- **Slider** : horizontal overflow, track infini en JS

### Sections sticky

Les sections sticky utilisent un `z-index` layering précis :

```
z-index: 0  → video-hero (sticky base)
z-index: 2  → sections normales (trio, slider, footer...)
z-index: 3  → sections above video-hero
z-index: 4  → sections above category-sticky
```

---

## 5. Animations & interactions

### Timings standards

| Nom | Durée | Easing | Usage |
|---|---|---|---|
| Hover générique | `0.2s ease` | ease | États hover simples |
| Entrée UI | `0.34s cubic-bezier(.22,.61,.36,1)` | out-back léger | Header scroll, modals |
| Copy in | `0.62s cubic-bezier(.18,.88,.2,1)` | out-expo | Textes hero entrants |
| Copy out | `0.34s cubic-bezier(.55,0,.78,.22)` | in-expo | Textes hero sortants |
| Nav in | `0.36s cubic-bezier(.18,.88,.2,1)` | out-expo | Boutons nav entrants |
| Nav out | `0.30s cubic-bezier(.55,0,.78,.22)` | in-expo | Boutons nav sortants |
| Nav pulse | `0.32s cubic-bezier(.22,.86,.24,1)` | out-back | Feedback nav |
| Transitions rapides | `0.22–0.28s ease` | ease | Search, toggles |

### Keyframes disponibles

| Keyframe | Durée | Usage |
|---|---|---|
| `heroFade` | 0.18s linear | Transition vidéo hero |
| `heroTechFrameGrain` | 0.5s steps(3) | Grain cadre tech (infini) |
| `heroTechFrameGlitch` | 9.6s ease-in-out | Glitch cadre (infini) |
| `heroCopyGlitch` | 0.44s ease | Glitch texte hero |
| `heroCopyLineIn/Out` | 0.62s / 0.34s | Slide texte hero |
| `heroNavScrambleIn/Out` | 0.36s / 0.30s | Nav buttons entrée/sortie |
| `heroNavScramblePulse` | 0.32s | Feedback bouton nav |
| `collectionsTrioGrain` | 1.2s steps(2) | Grain cards trio (infini) |
| `collectionTicker` | var (16–80s) | Ticker text infini |
| `footerNewsletterLiquid` | 9.8s linear | Animation footer |
| `footerNewsletterPixelDrift` | 1.8s steps(6) | Pixel drift footer |

### Autoplay hero

```js
const HERO_AUTOPLAY_DELAY_MS = 7000;   // 7s entre slides
// Logique ping-pong : 1 → 2 → 3 → 2 → 1 → 2 → ...
// Timer reset après toute interaction manuelle
```

### Scramble effect

- **Chars body** : `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789`
- **Chars CTA** : `ABCDEFGHIJKLMNOPQRSTUVWXYZ_`
- Durée révélation : 10 steps × 28ms = ~280ms
- S'applique à : nav links, `.button`, `video-hero__availability`, CTA `.collections-trio__cta`
- Désactivable via `data-disable-scramble="true"`

### Reduced motion

```css
@media (prefers-reduced-motion: reduce) {
  /* Toutes transitions et animations désactivées */
}
```

---

## 6. Composants

### 6.1 Header

**Root** : `.site-header`  
**Shell** : `.site-header-shell > .site-header-frame`  
**Custom prop** : `--header-logo-width: {n}px`

```
.site-header
  ├── .header-cell.header-menu     (nav + panel)
  ├── .header-cell.header-brand    (logo)
  └── .header-cell.header-actions  (search, account, cart)
```

**États** : `.is-scroll-hidden` / `.has-mobile-menu-open` / `.has-search-overlay-open`

---

### 6.2 Video Hero Slider

**Root** : `.video-hero`  
**Data hook** : `data-video-hero`

```
.video-hero
  └── .video-hero__media-frame
      ├── .video-hero__media       (image + video transition)
      ├── .video-hero__overlay
      │   ├── .video-hero__side-progress
      │   ├── .video-hero__tech-frame
      │   └── .video-hero__content-wrap
      │       ├── .video-hero__panel > article.video-hero__slide
      │       │   └── .video-hero__copy-grid
      │       └── .video-hero__footer
      │           ├── .video-hero__controls
      │           └── .video-hero__steps
```

**Data-attributes slide** :
```html
data-slide
data-index="{n}"
data-image-desktop="{url}"
data-image-mobile="{url}"
data-transition-desktop="{url}"
data-transition-mobile="{url}"
data-transition-prev-desktop="{url}"
data-transition-prev-mobile="{url}"
```

---

### 6.3 Collection Slider

**Root** : `.collection-slider`  
**Data hook** : `data-collection-stacks`

**Custom props** :
```css
--collection-slider-bg
--collection-slider-cell-bg
--collection-slider-ticker-bg
--collection-slider-meta-bg
--collection-slider-card-separator
--collection-slider-row-height      /* 280–520px, défaut 380px */
--collection-slider-card-width      /* 180–340px, défaut 260px */
--collection-slider-ticker-duration /* 16–80s, défaut 34s */
```

```
.collection-slider
  └── .collection-slider__inner
      └── article.collection-slider__row
          ├── .collection-slider__overlay
          │   ├── __badge--title   (ticker nom collection)
          │   └── __badge--controls + __badge--view-all
          ├── .collection-slider__fixed-quick-adds
          ├── .collection-slider__swipe-hints
          └── .collection-slider__viewport [data-stack-viewport]
              └── .collection-slider__track [data-stack-track, data-loop-size]
                  └── article.collection-slider__card [data-product-card]
                      ├── form [data-quick-add-form]
                      └── a.collection-slider__product-link
                          ├── .collection-slider__media
                          └── .collection-slider__meta
```

**Variante product page** : `sections/product-collection-slider.liquid`  
→ Même markup, auto-détecte `product.collections.first`, exclut le produit courant.

---

### 6.4 Collections Trio Showcase

**Root** : `.collections-trio`  
**Grille** : `1.12fr 1fr` × `1fr .58fr`

**Custom props** :
```css
--collections-trio-height          /* vh, 56–98, défaut 84 */
--collections-trio-overlay-opacity
--collections-trio-grid-gap        /* 1–6px */
--collections-trio-line-color      /* #E4EDF5 */
--collections-trio-card-bg         /* #121A25 */
--collections-trio-image-focus     /* object-position */
```

**Slots** :
- `--primary` : colonne 1, toute la hauteur (grand format)
- `--secondary-top` : colonne 2, ligne 1
- `--secondary-bottom` : colonne 2, ligne 2

---

### 6.5 Collections Duo Showcase

**Root** : `.collections-trio.collections-duo`  
**Grille** : `repeat(2, 1fr)` × `1fr` (50/50, une seule rangée)

Hérite de tous les tokens et styles de `.collections-trio`.  
Slot gauche → `--primary`, slot droit → `--secondary-top`.

---

### 6.6 Category Sticky Showcase

**Root** : `.category-sticky`  
**Data hook** : `data-category-sticky`

**Custom props** :
```css
--category-scroll-span     /* vh de scroll pour traverser la section */
--category-overlay-opacity
```

**Comportement** : la section est `position: sticky; top: 0; z-index: 0`. Les sections suivantes la recouvrent progressivement via `margin-top: calc(-100svh + --section-rail-gap)`.

---

### 6.7 Featured Collection

**Root** : `.featured-collection`  
Grille produits basique, pas de custom props.

---

## 7. Patterns de layout

### Section sticky + reveal

```
[category-sticky-showcase]   ← sticky z:0, plein écran
[collection-slider]          ← z:4, margin-top: calc(-100svh + gap)
```

CSS automatique via `@supports selector()` — pas de classes manuelles.

### Collection Slider → Trio / Duo (sans gap)

Quand un slider est suivi d'un trio/duo, le `padding-bottom` du slider s'ajuste automatiquement pour supprimer l'espace parasite. Géré en CSS natif.

### Stack home type

```
[video-hero-slider]
[category-sticky-showcase]   ← sticky
[collections-duo-showcase]   ← révèle par-dessus
[category-sticky-showcase]   ← sticky
[collection-slider]
[featured-collection]
```

---

## 8. Data-attributes JS (hooks)

| Data-attribute | Composant | Rôle |
|---|---|---|
| `data-video-hero` | Hero | Container principal |
| `data-slide` | Hero | Article slide |
| `data-prev-trigger` / `data-next-trigger` | Hero | Boutons nav |
| `data-jump-index="{n}"` | Hero | Nav par index |
| `data-collection-stacks` | Slider | Container slider |
| `data-stack-viewport` | Slider | Viewport scroll |
| `data-stack-track` | Slider | Track infini |
| `data-loop-size="{n}"` | Slider | Nb produits loopés |
| `data-stack-prev` / `data-stack-next` | Slider | Contrôles |
| `data-product-card` | Slider | Article produit |
| `data-quick-add-form` | Slider | Form panier rapide |
| `data-fixed-quick-add-slot="{n}"` | Slider | Bouton fixe par slot |
| `data-category-sticky` | Sticky | Container |
| `data-category-item` | Sticky | Article catégorie |
| `data-mobile-nav` | Header | Nav mobile |
| `data-mobile-nav-toggle` | Header | Hamburger |
| `data-search-trigger` | Header | Ouverture search |
| `data-search-overlay` | Header | Overlay search |
| `data-search-input` | Header | Input search |
| `data-search-results` | Header | Résultats |
| `data-disable-scramble="true"` | Global | Désactive scramble |
| `data-copy-final` | Global | Texte final scramble |
| `data-lenis-prevent="true"` | Global | Désactive smooth scroll |

---

## 9. États CSS globaux

| Classe | Usage |
|---|---|
| `.is-active` | Slide/step/item actif |
| `.is-open` | Menu/overlay ouvert |
| `.is-scroll-hidden` | Header masqué au scroll |
| `.is-copy-animating` | Animation copy en cours |
| `.is-copy-leaving` | Copy sort |
| `.is-copy-hidden` | Copy masqué |
| `.is-nav-entering` | Bouton nav entrant |
| `.is-nav-pulsing` | Bouton nav pulse |
| `.is-nav-leaving` | Bouton nav sortant |
| `.is-search-loading` | Search en cours |
| `.is-disabled` | Bouton désactivé |

---

## 10. Breakpoints

| Nom | Valeur | Usage |
|---|---|---|
| Mobile | `max-width: 640px` | Layout et tailles mobiles |
| Tablet | `max-width: 980px` | Ajustements tablette |
| Large tablet | `max-width: 1180px` | Transitions layout |
| Desktop | `min-width: 981px` | Styles desktop |
| Pointer fine | `(hover: hover) and (pointer: fine)` | Lenis smooth scroll |
| Reduced motion | `prefers-reduced-motion: reduce` | Désactive animations |

**Hero mobile breakpoint** : dynamique via `data-mobile-breakpoint="{px}"` (range 480–1024px, défaut 768px).

---

## 11. Règles pour de nouveaux composants

1. **Lire d'abord ce doc** avant d'écrire une ligne de CSS.
2. **Réutiliser les custom props existantes** (`--hero-shell-inset`, `--section-rail-gap`...) plutôt qu'inventer de nouvelles valeurs.
3. **BEM strict** : `.composant__element--modifier`. Pas de classes utilitaires globales.
4. **Injecter les couleurs/tailles configurables** via `style=""` inline sur la balise `<section>` en custom props.
5. **Ajouter le composant à la liste `position: relative; z-index: 2`** dans `base.css` (ligne ~154).
6. **Scramble obligatoire** sur tout nouveau CTA interactif.
7. **Images** : toujours `image_url: width: 1200` (cards) ou `width: 2600` (hero/full bleed) + `loading: lazy` (sauf above-the-fold).
8. **Mobile** : les grids multi-colonnes passent en `grid-template-columns: 1fr` sous 640px.
9. **Pas d'animation sans `prefers-reduced-motion`**.

---

## 12. Fichiers clés

| Fichier | Rôle |
|---|---|
| `assets/base.css` | Styles globaux, tokens, tous les composants |
| `assets/theme.js` | Scramble, sliders, header, Lenis, search |
| `sections/header.liquid` | Nav, search overlay |
| `sections/video-hero-slider.liquid` | Hero référence visuelle |
| `sections/collection-slider.liquid` | Slider produits principal |
| `sections/collections-trio-showcase.liquid` | Cards editoriales 3 slots |
| `sections/collections-duo-showcase.liquid` | Cards editoriales 2 colonnes |
| `sections/category-sticky-showcase.liquid` | Section sticky plein écran |
| `sections/product-collection-slider.liquid` | Suggestions produits (page produit) |
| `templates/index.json` | Ordre et config des sections de la home |
| `templates/product.json` | Ordre et config des sections de la page produit |
