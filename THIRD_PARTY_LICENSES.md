# Third-Party Licenses

This project uses data and code derived from the following third-party
sources. The full license texts are reproduced below.

---

## Swiss Tax Tariff Data (ESTV) via devbrains/swisstaxcalculator

**Source:** https://github.com/devbrains-com/swisstaxcalculator
**License:** MIT
**Copyright:** © 2023–2026 devbrains-com contributors
**Used in:**
- `src/engine/steuer-data/2025/` — JSON snapshots of cantonal tax tariffs,
  factors (Steuerfüsse) and locations (Gemeinden) for tax year 2025
- `src/engine/steuer-data/2026/` — same for tax year 2026
- `src/engine/steuer-engine/calc.ts` — calculation logic adapted from
  `lib/taxes/tarif/index.ts` (BUND/ZUERICH/FLATTAX/FREIBURG/FORMEL types),
  ported to plain JavaScript number arithmetic without the dinero.js
  dependency

The original data is sourced from the official Swiss Federal Tax
Administration (ESTV) calculator at
https://swisstaxcalculator.estv.admin.ch/ via the `--download` workflow
in the upstream project.

### MIT License (devbrains/swisstaxcalculator)

```
MIT License

Copyright (c) 2023-2026 devbrains-com

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
