# Famiglia di icone per sostituire quelle datate

Type: research
Status: resolved
Blocked by: —

## Question

Le icone attuali sono `MaterialIcons` di `@expo/vector-icons` 15.1.1: il vecchio set Material Icons, che spiega in parte l'aspetto datato. I nomi sono salvati nei dati (campi, layout, cartelle, automazioni, modelli: vedi `audit-tema.md`), quindi qualunque cambio passa da una tabella di corrispondenza applicata al momento del disegno.

Quale famiglia usare per le sostituzioni, confrontando almeno:

- restare su MaterialIcons e cambiare solo i glifi scelti con altri dello stesso set;
- Material Symbols (stessi nomi o quasi, disegno più recente): come si usa in RN 0.81 / Expo 54 su Android e web;
- `lucide-react-native` 0.475 (già installato, mai usato; richiede `react-native-svg`, presente);
- `MaterialCommunityIcons` (già dentro `@expo/vector-icons`).

Per ciascuna: copertura dei 230 nomi usati, peso nel bundle, resa a 16-28 px, funzionamento sul web e su Android, licenza, quanto la tabella di corrispondenza diventa lunga. Risposta: una raccomandazione con motivazione.

## Answer

22 novembre 2026. Fonti: sorgenti in `node_modules`, repository e documentazione ufficiali. Nessun codice modificato.

**Base.** Lo script di estrazione (stesso ambito del ticket) trova 331 tag `<MaterialIcons` in 32 file e 229 nomi candidati, con almeno un falso positivo (`details` in `constants/config.ts:45` è un id); l'audit ne conta 230. I numeri sotto valgono sui 229.

| | 1. MaterialIcons, solo glifi | 2. Material Symbols | 3. Lucide 0.475 | 4. MaterialCommunityIcons |
|---|---|---|---|---|
| Copertura | 229/229 (è il set attuale); solo 32 glifi `-outline`; set «no longer updated», fermo dal 2022 | ≈227/229 con lo stesso nome in snake_case (mancano `info_outline`, `play_circle_filled`); controllo fatto via WebFetch sul file codepoints, non con script | 54 omonimi su 1.555 icone, con falsi amici (`delete` = tasto backspace, `pin` = puntina, `filter` = imbuto, `tag` = cartellino); equivalenti semantici per quasi tutti, con altro nome | 82 omonimi su 7.448 glifi, stessi falsi amici (`pin`, `filter`, `tag`); equivalenti semantici per quasi tutti, con altro nome |
| Peso | 0 in più (TTF 357 KB già nel bundle) | font variabile Outlined 10,7 MB TTF / 4,0 MB woff2; oppure SVG singoli (serve `react-native-svg-transformer`, non installato) | 0,6 KB in media per icona, ma solo con import profondo: il campo `react-native` punta al barile `dist/esm/lucide-react-native.js` (tutte le 1.555), e il tree shaking di Expo è sperimentale, solo in produzione, con `EXPO_UNSTABLE_TREE_SHAKING`, qui assente | TTF 1,31 MB, già nel grafo degli asset con ogni probabilità: `main` è `IconsLazy.js`, che richiede tutte le 15 famiglie (dedotto dai sorgenti, non misurato su build) |
| Resa 16-28 px | glifo pieno, griglia 24, nitido | disegno migliore, ma RN 0.81 non ha `fontVariationSettings` (solo `fontVariant`): resta l'istanza predefinita del font | tratto 2 su 24: a 16 px scende a 1,33 px, salvo `absoluteStrokeWidth` | griglia 24 Material, variante piena e `-outline` per quasi ogni glifo |
| Web e Android | funziona oggi | SDK 54: `expo-symbols` 1.0.8 disegna solo su iOS, Android e web mostrano il `fallback`; Android e web solo da SDK 55; `@expo/material-symbols` è solo Android e richiede `@expo/ui` | funziona con react-native-svg 15.12.1, anche sul web; peer `react` ^16-^18, il progetto è su 19.1 | funziona oggi; sul web il font si scarica al primo uso (icona vuota finché non carica) |
| Licenza | Apache 2.0 | Apache 2.0 | ISC | Pictogrammers Free License (icone Apache 2.0) |
| Tabella | solo le voci cambiate | conversione meccanica + 2 eccezioni, ma cambierebbe il disegno di tutta l'app | una voce e un import statico per ogni icona mappata | solo le voci cambiate, `{ famiglia, nome }` |
| Prestazioni | 1 `Text` per icona | font: 1 `Text`; SVG: come Lucide | `Svg` + 2-5 figli (media 3,9) per icona: costo reale in griglie lunghe | 1 `Text` per icona |
| Accanto alle ~200 non toccate | coerente | stesso linguaggio, ma contorno sottile accanto al pieno | tratto arrotondato, stacca a vista | stessa griglia e linguaggio, pieno o contorno a scelta |

**Raccomandazione: MaterialCommunityIcons per le sostituzioni, MaterialIcons per tutto il resto** (e scambi interni quando il set attuale ha già un glifo migliore, es. `monitor-weight`, `numbers`).

Motivazione, sui due vincoli che distinguono le opzioni:
1. *Si cambia solo una parte*: le icone nuove stanno accanto a circa 200 MaterialIcons piene. MCI ha la stessa griglia e lo stesso linguaggio Material e offre pieno e `-outline`, quindi si tiene un solo stile per gruppo. Lucide stacca proprio nel misto.
2. *I nomi arrivano come stringhe dai dati*: MCI è un font con `name` stringa e la stessa API (`name`, `size`, `color`); il componente unico passa solo `{ famiglia, nome }`. Lucide chiede un import statico per voce e un albero SVG per icona.
In più: nessun pacchetto nuovo, peso aggiunto verosimilmente nullo, stesso meccanismo già collaudato su web e Android. Material Symbols ha il disegno più attuale e quasi gli stessi nomi, ma su SDK 54 non c'è un modo mantenuto per Android e web: da rivalutare con il passaggio a SDK 55 (`expo-symbols` usa Material Symbols su Android e web), cambiando allora la famiglia di destinazione nella stessa tabella.

Regole per il componente: tradurre solo tramite voci esplicite, mai «prova lo stesso nome nell'altra famiglia» (falsi amici). Nomi fissi nel codice (barra, «Tutti»): scrivere direttamente il nome nuovo; la tabella serve ai nomi che arrivano dai dati. Una voce cambia il glifo ovunque quel nome compare, anche tra le icone scelte dall'utente nei cataloghi.

**Corrispondenze candidate** (MCI). Ogni nome è verificato nel glyphmap di `@expo/vector-icons` 15.1.1; la resa va controllata a schermo. Barra in basso tutta a contorno; icone di campi e chip piene, come le icone scelte dall'utente che stanno accanto.

| Da (MaterialIcons) | Dove | A (MaterialCommunityIcons) | Alternativa |
|---|---|---|---|
| `grid-view` | barra, Home | `view-grid-outline` | `home-variant-outline` |
| `timeline` | barra, Cronologia | `history` | `timeline-clock-outline` |
| `account-tree` | barra, Automazioni | `lightning-bolt-outline` | `sitemap-outline` |
| `add-circle` | barra, Aggiungi | `plus-circle-outline` | `plus-box-outline` |
| `settings` | barra, Impostazioni | `cog-outline` | — |
| `fitness-center` | Peso, Peso Oro | `weight` | `weight-kilogram` (solo kg) |
| `pin` | tipo Numero | `numeric` | `pound` |
| `straighten` | Lunghezza, Larghezza, Taglia | `tape-measure` | `ruler` |
| `apps` | chip «Tutti» delle cartelle | `folder-multiple` | `select-all` |
| `short-text` | tipo testo breve | `text-short` | `form-textbox` |
| `radio-button-checked` | scelta singola | `radiobox-marked` | — |
| `check-box` | scelta multipla | `checkbox-marked` | `checkbox-multiple-marked` |
| `description` | tipo documento | `file-document` | `file-document-outline` |
| `category` | tipo di pelliccia | `shape` | `tag-outline` |
| `place` | posizione | `map-marker` | `map-marker-outline` |

Fonti: `node_modules/@expo/vector-icons/package.json` (`main`), `build/IconsLazy.js:121-139`, `build/createIconSet.js` (font caricato al mount), glyphmap `MaterialIcons.json` e `MaterialCommunityIcons.json`, `Fonts/*.ttf`; `node_modules/lucide-react-native/package.json` (`react-native`, `peerDependencies`), `dist/esm/createLucideIcon.js`, `dist/esm/icons/`; `node_modules/expo-symbols/build/SymbolView.js`, `SymbolView.web.js`, `SymbolModule.types.d.ts:9`; `node_modules/react-native/Libraries/StyleSheet/StyleSheetTypes.d.ts:480`; `metro.config.js`. Web: [tree shaking Expo](https://docs.expo.dev/guides/tree-shaking/), [expo-symbols SDK 55](https://docs.expo.dev/versions/v55.0.0/sdk/symbols), [@expo/material-symbols](https://cdn.jsdelivr.net/npm/@expo/material-symbols@0.1.1/README.md), [google/material-design-icons](https://github.com/google/material-design-icons) (dimensioni via API GitHub di `variablefont/`), [codepoints Material Symbols](https://raw.githubusercontent.com/google/material-design-icons/master/variablefont/MaterialSymbolsOutlined%5BFILL%2CGRAD%2Copsz%2Cwght%5D.codepoints), [guida Material Symbols](https://developers.google.com/fonts/docs/material_symbols), [licenza MDI](https://github.com/Templarian/MaterialDesign/blob/master/LICENSE), [material-symbols-react-native](https://github.com/guiladg/material-symbols-react-native) (terzi, 5 stelle).
