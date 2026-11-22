# Quali icone sono datate o poco chiare, e con cosa sostituirle

Type: prototype
Status: resolved
Blocked by: 04

## Question

L'utente vuole sostituire solo le icone datate o poco chiare. Quali sono, secondo lui?

Preparare un foglio con le icone più visibili (barra in basso, Inventario, Scheda, Aggiungi, Impostazioni, le predefinite dei campi di base e dei tipi di campo) e, per ognuna, l'icona attuale accanto a 1-2 sostitute nella famiglia scelta nel ticket 04. Candidate evidenti dal codice: `fitness-center` (manubrio) per Peso, `pin` per il tipo Numero, `account-tree` per Automazioni, `straighten` usata per misure diverse, `apps` per «Tutti». L'utente segna quali cambiare.

Risposta: la tabella di corrispondenza definitiva `nome attuale → nome nuovo`, che il componente icone applicherà anche ai nomi salvati nei dati e alle voci dei cataloghi (10, 8, 39 e 106 icone).

Aggiornamento del 22 novembre 2026: le icone candidate sono già disegnate nella tela dei 5 stili (elenco nel ticket 06, «icone nuove solo dove il ticket 04 le propone») e fanno parte dei ritocchi comuni chiesti all'utente nel ticket 08. Una sola risposta chiude entrambi i ticket; se l'utente accetta, la tabella è quella delle corrispondenze candidate del ticket 04, limitata alle voci del ticket 06.

## Answer

22 novembre 2026: l'utente ha accettato i ritocchi comuni (ticket 08), icone comprese. Tabella definitiva (tutte MaterialCommunityIcons, nomi controllati nel glyphmap dal ticket 04):

| Da (MaterialIcons) | Dove | A |
| --- | --- | --- |
| `grid-view` | barra, Home | `view-grid-outline` (attiva `view-grid`) |
| `timeline` | barra, Cronologia | `history` |
| `account-tree` | barra, Automazioni | `lightning-bolt-outline` (attiva `lightning-bolt`) |
| `add-circle` | barra, Aggiungi | `plus-circle-outline` (attiva `plus-circle`) |
| `settings` | barra, Impostazioni | `cog-outline` (attiva `cog`) |
| `fitness-center` | Peso, Peso Oro | `weight` |
| `straighten` | Lunghezza, Larghezza, Taglia | `tape-measure` (misure); `arrow-expand-horizontal` dove la tela lo usa per la larghezza |
| `apps` | chip «Tutti» delle cartelle | `folder-multiple` |

Tutte le altre icone restano le MaterialIcons di oggi. Tutti i 13 nomi della tabella, comprese le versioni piene per la voce attiva, sono presenti nel glyphmap `MaterialCommunityIcons.json` di `@expo/vector-icons` (controllato il 22 novembre); `history` resta uguale da attiva.
