# Claude Code Configurations

Boilerplate de configurations Claude Code par technologie.

## Structure

```
ai/
├── angular/                    # Config Angular 21 + Nx + NgRx
│   ├── CLAUDE.md               # Instructions principales
│   └── .claude/
│       ├── settings.json       # Permissions Nx
│       └── rules/
│           ├── components.md   # Smart/Dumb, signals, OnPush
│           ├── state.md        # NgRx, entity adapter, effects
│           └── testing.md      # Vitest, marble, Playwright
│
├── _shared/                    # Conventions communes (toutes technos)
│   ├── CLAUDE.md               # Git, TypeScript, code quality
│   └── .claude/
│       └── skills/
│           └── learning/       # Skill pédagogique
│               └── SKILL.md
│
└── README.md                   # Ce fichier
```

## Utilisation

### 1. Copier la config dans ton projet

```bash
# Pour un projet Angular
cp -r angular/.claude /chemin/vers/ton/projet/
cp angular/CLAUDE.md /chemin/vers/ton/projet/

# Copier aussi le shared (importé automatiquement via @../_shared/CLAUDE.md)
# OU fusionner le contenu dans ton CLAUDE.md
```

### 2. Adapter le CLAUDE.md

Le fichier `CLAUDE.md` importe le shared via :

```markdown
@../_shared/CLAUDE.md
```

Si tu copies dans un projet isolé, remplace cette ligne par le contenu de `_shared/CLAUDE.md` directement.

### 3. Personnaliser

- **Préfixe composants** : modifier `app-` dans les règles
- **Commandes** : ajuster les scripts npm/nx selon ton projet
- **Permissions** : éditer `.claude/settings.json`

## Skills disponibles

### `/learning` - Mode apprentissage

Active un mode pédagogique où Claude :
- Explique avant d'implémenter
- Attend ta validation
- Source toutes les décisions (docs officielles)
- Montre les alternatives

**Usage** :
```
/learning           # Mode général
/learning nextjs    # Focalisé sur Next.js
/learning vue       # Focalisé sur Vue
```

**Désactivation** : `exit learning mode` ou `mode normal`

Pour utiliser cette skill dans un projet :
```bash
cp -r _shared/.claude/skills /chemin/vers/ton/projet/.claude/
```

## Règles communes (`_shared/CLAUDE.md`)

| Règle | Description |
|-------|-------------|
| Nommage explicite | Pas de `c`, `x`, `tmp` - noms descriptifs |
| Pas de lint disable | Sauf avec justification + ticket |
| Conventional commits | `feat:`, `fix:`, `refactor:`, etc. |
| TypeScript strict | Pas de `any`, types explicites |
| Code auto-documenté | Commentaires = "pourquoi", pas "quoi" |

## Angular - Points clés

| Aspect | Convention |
|--------|------------|
| Components | `standalone` par défaut (ne pas ajouter) |
| Templates | Toujours dans fichiers `.html` séparés |
| Inputs/Outputs | `input()`, `output()`, `model()` - pas de decorators |
| Change Detection | `OnPush` obligatoire |
| State | NgRx + Entity Adapter + Functional Effects |
| Tests RxJS | Marble testing uniquement (pas de `.subscribe()`) |
| Tests E2E | Playwright |

## Ajouter une nouvelle techno

1. Créer le dossier : `mkdir -p nouvelle-techno/.claude/rules`
2. Créer `nouvelle-techno/CLAUDE.md` avec `@../_shared/CLAUDE.md` en haut
3. Ajouter les règles spécifiques dans `.claude/rules/`
4. Optionnel : `.claude/settings.json` pour les permissions

## Todo

- [ ] Next.js (App Router, Server Components)
- [ ] Vue 3 (Composition API, Pinia)
- [ ] NestJS (backend)
- [ ] React (Vite, Zustand/Jotai)
