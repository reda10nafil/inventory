# Cosa significa «stile Redex del progetto Rede»

Type: grilling
Status: resolved
Blocked by: —

## Question

Uno dei 5 stili deve essere «nello stile Redex del progetto Rede». A cosa si riferisce l'utente: un sito, un'app, un design system o un file preciso? Dove si trova (cartella, link, artefatto)?

La sessione del 21 novembre ha solo supposto che fosse il sito di `Progetti suddivisi/Analisi software/Rea reverse` (`website/public/assets/styles.css`: bianco, inchiostro, blu `#294f82`). Non è confermato: chiederlo all'utente, non dedurlo.

## Answer

22 novembre 2026, risposta dell'utente: è il progetto in `C:\Users\reda_\Desktop\redx`, cioè il pannello **Ishtar Lab** (catalogo e inventario moda, progetto Ishtar Hub). La supposizione su «Rea reverse» era sbagliata.

Dove sta lo stile: `frontend/ishtar-lab/assets/index-B-NC1f34.css` (token, vetro, chiaro/scuro, bordi, riflessi, tipografia, pulsanti, finestre), con le regole in `.ai-style-rules.md` della stessa cartella (tra l'altro: niente fondi bianchi o colori rigidi nelle finestre, sempre la superficie vetro). Token principali, tema chiaro → scuro:

| Cosa | Chiaro | Scuro |
| --- | --- | --- |
| Carattere | Urbanist (taglie 11-34 px) | uguale |
| Fondo | `#f4e6e2` con velatura calda rosa-pesca-azzurro e «sfere» colorate sfocate | `#130c0f` con velature scure |
| Vetro | `#fff3` / `#ffffff57`, `blur(20px) saturate(200%)`, bordo `#fffffff2` | `#22161b47`, bordo `#ffffff38` |
| Card | `#fcf8f7` | `#231a1e` |
| Testo | `#24181c`, secondario `#5b4a50` | `#f6eef0`, `#bba9ae` |
| Accento | rosa scuro `#c2395f`, testo sopra `#fff` | `#ff7ba1`, testo sopra `#2a0814` |
| Stati | buono `#18703f`, avviso `#855600`, errore `#b22b2a`, info `#1f5d96` | versioni chiare |
| Raggi | 10, 14, 20, 26 px | uguale |
| Ombre | morbide e lunghe, tinte di bordeaux | nere |

Per il prototipo: lo stile è vetro come Babilonia; la sfocatura su Android dipende dal ticket 05. Il pannello ha tema chiaro e scuro: nel prototipo mostrare la versione scelta (proposta: chiara, che è la sua identità), ricordando che l'app avrà un solo tema (map.md, Out of scope).
