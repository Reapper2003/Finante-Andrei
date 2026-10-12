# 💰 Finanțe

Aplicație simplă de finanțe personale, gândită pentru telefon: cheltuieli, venituri,
economii și goal-uri, investiții, abonamente, datorii, avere netă, fond de urgență,
rapoarte lunare și export în Excel.

- Funcționează **fără internet** și se poate **instala pe ecranul telefonului** (PWA).
- Datele se salvează **doar pe telefonul tău**, în browser. Nu se trimit nicăieri.
- Nu are nevoie de server, bază de date sau instalări: sunt doar fișiere statice.

---

## Pune aplicația online cu GitHub Pages (~5 minute)

### Varianta recomandată: un repository separat

1. Intră pe **https://github.com**, apasă **New repository**.
   - Nume: de exemplu `finante`
   - Bifează **Public** (GitHub Pages gratuit merge doar pe repository-uri publice;
     **datele tale nu ajung pe GitHub**, ele rămân doar în telefon).
   - Apasă **Create repository**.
2. Apasă **uploading an existing file** și trage **tot conținutul folderului `finante`**
   (nu folderul însuși): `index.html`, `style.css`, `manifest.webmanifest`, `sw.js`,
   folderul `js` și folderul `icons`. Apasă **Commit changes**.
   > `index.html` trebuie să fie direct în repository, nu într-un subfolder.
3. Mergi la **Settings → Pages**. La *Branch* alege `main` și `/ (root)`, apasă **Save**.
4. După 1–2 minute apare linkul, de forma:
   **`https://numele-tau.github.io/finante/`**

### Alternativ: în același repository cu biblioteca

Dacă urci folderul `finante` în repository-ul existent al bibliotecii, linkul va fi
`https://numele-tau.github.io/biblioteca/finante/`. Funcționează la fel.

---

## Instalare pe telefon

Deschide linkul în browser, apoi:

- **iPhone (Safari):** butonul Partajează ⬆️ → **Adaugă pe ecranul principal**.
- **Android (Chrome):** meniul ⋮ → **Instalează aplicația** (sau „Adaugă pe ecranul de pornire”).

Aplicația se deschide pe tot ecranul, fără bara browserului, și merge și fără internet.

---

## Bine de știut

- **Datele sunt per dispozitiv.** Ce introduci pe telefon nu apare pe laptop. Ca să muți datele:
  *Mai mult → Setări → Backup (export JSON)*, apoi pe celălalt dispozitiv
  *Restaurare (import JSON)*.
- **Fă backup din când în când.** Dacă ștergi datele browserului sau dezinstalezi aplicația,
  datele se pierd.
- **Date demo:** pe ecranul Acasă (când aplicația e goală) sau în Setări → *Încarcă date demo*.
  Ele înlocuiesc datele existente.
- **Curs valutar:** pentru brokerii în EUR/USD, cursul se setează manual în Setări.

## Cum funcționează conturile

- **Curent**: salariu, venituri și cheltuieli zilnice. „Total disponibil” vine doar de aici.
- **Economii**: fond de urgență, goal-uri și „alte economii”.
- **Investiții**: brokeri → active → contribuții și valori.
- Mutarea banilor între conturi e un **transfer**, nu o cheltuială, deci nu apare în graficul de cheltuieli.

## Când modifici fișierele

Aplicația e păstrată în cache pentru funcționarea offline. După ce urci fișiere noi pe GitHub,
crește versiunea din `sw.js` (ex. `finante-v1` → `finante-v2`), ca telefoanele să ia versiunea nouă.
Ea apare după ce închizi și redeschizi aplicația.

## Test local (opțional)

```bash
python -m http.server 8000 --directory finante
```

Apoi deschide `http://localhost:8000`. Fișierul `index.html` nu merge deschis direct
(dublu-click), are nevoie de un server, la fel ca pe GitHub Pages.
