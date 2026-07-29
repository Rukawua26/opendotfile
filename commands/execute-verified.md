---
description: Ejecuta un objetivo con verificacion obligatoria antes de reportar completado.
---

# Execute Verified

Ejecuta un objetivo y requiere que un verificador pase antes de reportar completado.

Input: `/execute-verified <objetivo> --verify <comando>`

Flujo obligatorio:

1. **Plan**: describe brevemente los pasos para lograr el objetivo.
2. **Implement**: ejecuta los cambios necesarios.
3. **Verify**: corre el comando verificador exactamente como se especifico.
4. **Correct/Retry** (si falla): corrige y vuelve a verify. Max 3 intentos.
5. **Report**: solo cuando verify pasa, reporta resultado con evidencia (`stdout`, `exit code`, archivos relevantes).

Reglas:
- No reportar "completado" si el verificador no paso.
- Si el verificador falla 3 veces, documentar como bloqueante y ofrecer alternativas.
- Incluir la salida del verificador como evidencia.
- Si el objetivo no tiene verificador explicito, pedir uno antes de empezar.

Output esperado:

```
Objetivo: <texto>
Verificador: <comando>
Verify: PASS/FAIL (X/3 intentos)
Evidencia: <exit code, stdout, archivos>
Conclusion: completado / bloqueado
```
