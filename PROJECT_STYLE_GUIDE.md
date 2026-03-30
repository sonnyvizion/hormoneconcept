# Hormone Concept Style Guide

## Contexte

- Boutique Shopify cible: `hormone-concept.myshopify.com`
- Thème de travail: `Hormone Concept Custom` (`181101723915`)
- Ce document sert de référence de continuité pour les prochaines sections du site.

## Direction générale

- Le langage visuel du `video-hero` sert de base au reste du site.
- L’interface doit rester nette, minimale, éditoriale et premium.
- Les cadres, rails, espacements et animations doivent garder une logique cohérente d’une section à l’autre.
- Éviter les effets décoratifs gratuits ou trop “template”.

## Header / Nav

- La nav est fixe.
- La nav est construite en blocs séparés, pas en colonnes avec simples bordures internes.
- L’écart entre les blocs de nav est de `2px`.
- Le bloc gauche de la nav est réservé au logo image, pas à un logotype texte.
- Le logo se règle dans le customizer via `sections/header.liquid`.
- Les liens de nav utilisent l’effet scramble au hover/focus.
- Les éléments de nav ne doivent jamais bouger autour d’un lien pendant une animation.
- Les textes interactifs de nav doivent rester sur une seule ligne.

## Hero Video

- Le `video-hero` est la référence visuelle principale.
- Desktop: le hero est à `85vh`.
- Le hero est full bleed, sans marge extérieure parasite.
- Le cadre du hero est intérieur, aligné avec les rails du site.
- Le contenu du hero a plus d’air horizontal pour coller à la maquette.
- Le `h2` et le `h3` du hero partagent la même taille.
- Taille desktop actuelle des titres hero: base à `3vw`.
- Les `p[data-copy-final]` du hero sont à `opacity: 0.5`.
- Le CTA central `video-hero__availability` doit rester sur une seule ligne.

## Animations

- L’effet scramble est une signature du site.
- Il s’applique:
- aux liens de nav
- aux CTA standards `.button`
- aux contrôles du hero
- à `video-hero__availability`
- Le scramble doit toujours revenir au mot final d’origine.
- Les éléments animés au hover ne doivent pas provoquer de reflow visuel.
- Les CTA et textes interactifs animés restent en `nowrap`.

## Transitions du Hero

- Les transitions texte du hero utilisent le scramble à l’entrée et à la sortie.
- Pas de dégradé sombre pendant l’animation texte.
- Les transitions média ne doivent jamais montrer une autre paire entre la vidéo de transition et l’image finale.
- L’image cible doit être prête avant de révéler la fin de transition.

## Comportement du Slider

- Le hero supporte la navigation manuelle par boutons.
- Le hero supporte le scroll horizontal pour passer à la paire suivante/précédente.
- Le hero autoplay toutes les `7s`.
- L’autoplay suit une logique ping-pong:
- `1 -> 2 -> 3 -> 2 -> 1 -> 2 -> ...`
- Après une interaction manuelle, le timer repart proprement.

## Règles de cohérence pour les prochaines sections

- Réutiliser les mêmes rails/cadres que le hero et la nav.
- Réutiliser le même ton d’animation pour les CTA.
- Réutiliser le même niveau de contraste, de netteté et de densité visuelle.
- Garder les textes en capitales espacées quand c’est déjà le langage du composant.
- Si une nouvelle section a un CTA fort, il doit hériter de la logique scramble.
- Si une nouvelle section a une transition produit, elle doit rester alignée sur le système du hero.

## Fichiers clés

- `assets/base.css`
- `assets/theme.js`
- `sections/header.liquid`
- `sections/video-hero-slider.liquid`

## Règle de travail

- Avant d’introduire un nouveau composant, vérifier s’il peut reprendre directement les règles du `video-hero`.
- En cas d’hésitation, privilégier la continuité avec le hero plutôt qu’un nouveau langage visuel.
