# Verify — Feature 012: Receipt Scope And Refutation

## Criterios de Aceptacion

| ID | Resultado | Evidencia |
|----|-----------|-----------|
| AC-1 | PASS | `successor cannot expand or shrink the parent manifest` |
| AC-2 | PASS | `successor preserves scope while accepting corrected bytes` |
| AC-3 | PASS | `lineage rejects a third attempt` |
| AC-4 | PASS | `lineage rejects non-monotonic, excessive, and non-initial explicit attempts` |
| AC-5 | PASS | Core y plugin capturan `refuter` con evidencia, `reviewer_id` y `execution_id` |
| AC-6 | PASS | `refuter can be captured as an optional lens without becoming required` |
| AC-7 | PASS | `a failed optional refuter blocks finalization`; `a blocked optional refuter also blocks finalization` |
| AC-8 | PASS | `legacy nested Git receipts remain fresh and support successor lineage`; `legacy receipt with a historical high attempt remains readable but cannot pass gate` |
| AC-9 | PASS | `183/183` tests Node y `6/6` shell |

## Correcciones Detectadas Durante Revision

- Se endurecio la validacion de lineage en `validate`, `status`, `finalize` y `gate`, no solo en `start`.
- Los receipts legacy con `attempt > 2` siguen siendo legibles, pero no pueden pasar el gate.
- Una raiz explicita debe iniciar en `attempt: 1`.
- El lineage se valida recursivamente y detecta ciclos con `lineage_cycle`.
- Un successor no puede crearse desde un parent cuyo lineage no sea `pass`.
- Un gate fallido por lineage marca el receipt como `blocked` y limpia el pointer.
- La documentacion de captura distingue lenses requeridos del refuter opcional.

## Revision Independiente

- Code Reviewer ronda inicial: cuatro findings; todos corregidos.
- Refuter: cuatro findings iniciales refutados en el estado corregido.
- Code Reviewer segunda ronda: dos findings; corregidos.
- Verificacion final Code Reviewer: `No findings.`

## Comandos Ejecutados

- `node --test tests/organic-rdd.test.js tests/organic-rdd-plugin.test.js` -> `85 pass / 0 fail`
- `node --test tests/*.test.js mcp/*.test.js mcp/memory-adapter/tests/*.test.js` -> `183 pass / 0 fail`
- `bash tests/backup-opencode-config.test.sh` -> `6 pass / 0 fail`
- `node --check lib/organic-rdd.js && node --check plugins/organic-rdd.js` -> PASS
- `git diff --check -- lib/organic-rdd.js plugins/organic-rdd.js commands/review-capture.md commands/review-start.md tests/organic-rdd.test.js tests/organic-rdd-plugin.test.js` -> PASS
- `opencode debug config` -> PASS
- Smoke runtime activo con `review_capture` y lens `refuter` -> PASS

## Despliegue

- Staging inicial: `/tmp/opencode/opencode-reconcile.aRUYur`
- Backups de sincronizacion del runtime:
  - `/home/miguel/.config/opencode.rdd-sync.20260830-163155`
  - `/home/miguel/.config/opencode.rdd-sync.20260830-165215`
  - `/home/miguel/.config/opencode.rdd-sync.20260830-173528`
- Copia final sincronizada por hashes a `~/.config/opencode/lib/organic-rdd.js`, `plugins/organic-rdd.js` y comandos Organic RDD.

## Reality-Check

REALITY-CHECK: AUTO-APPROVED
Reason: Suite completa pasa, revisiones independientes sin findings, runtime activo sincronizado y smoke test de refuter correcto.
Findings: 0 CRITICAL / 0 HIGH / 0 WARN
