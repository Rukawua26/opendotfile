# Harness Eficiente Sin K3

## Objetivo

Reducir el consumo de tokens, el coste y el contexto innecesario de OpenCode
manteniendo los proveedores actuales (OpenAI y Ollama), la calidad del trabajo
y la verificacion por riesgo.

El informe `k3_tech_report.pdf` se usa solo como fuente de principios de
diseno de harness: esfuerzo por tarea, herramientas modulares, contexto
estable, presupuestos, compactacion y verificacion independiente. No se
integrara ni evaluara Kimi K3.

## Usuario / Caso De Uso

El usuario necesita elegir entre perfiles economicos, normales y maximos sin
cargar herramientas, instrucciones o agentes que no correspondan a la tarea.
Tambien necesita metricas fiables para saber si una mejora ahorra tokens sin

## Alcance

- Eliminar contexto global duplicado y mantener una sola fuente efectiva de
  `AGENTS.md`.
- Sustituir referencias a modelos OpenAI que ya no existen en el catalogo
  activo.
- Hacer que `low`, `medium` y `max` representen perfiles operativos reales
  usando los modelos actuales y Ollama local cuando sea apropiado.
- Reducir la superficie de plugins y MCP por perfil, sin depender de la carga
  automatica global para definir un perfil ligero.
- Mantener esfuerzo fijo durante la sesion para favorecer la estabilidad de
  prefijos y caché.
- Corregir metricas de tokens, herramientas, delegaciones, lecturas amplias,
  esfuerzo y resultado.
- Mantener verificacion determinista y Organic RDD con limites de rondas.
- Documentar presupuestos, criterios de escalado y comandos de verificacion.
- Actualizar el repositorio de backup junto con la configuracion activa cuando
  el usuario apruebe la aplicacion del cambio.

## Fuera De Alcance

- Instalar, conectar, probar o enrutar tareas a Kimi K3.
- Cambiar el proveedor principal por Moonshot AI.
- Implementar KDA, MoE, RL, KV-cache propio, XTML, speculative decoding o
  infraestructura de inferencia de Kimi.
- Ejecutar Kimi K3 localmente.
- Añadir contexto automatico amplio para proyectos no relacionados.
- Reescribir Organic RDD o cambiar sus contratos de receipts.
- Borrar datos persistentes sin una migracion y backup explicitos.

## Limites De Contexto

- Leer solo: `opencode.jsonc`, `profiles/`, `plugins/`, `lib/`, `tests/`,
  `commands/effort.md`, skills de ahorro de tokens, `AGENTS.md`, scripts de
  perfiles, y documentacion directamente relacionada.
- Leer solo las secciones relevantes de `k3_tech_report.pdf`: esfuerzo,
  harness modular, compactacion/cache, presupuestos, verificacion y coste.
- No leer: bibliotecas completas de agentes, `node_modules/`, bases de datos,
  `.env`, historiales o backups salvo que una migracion los requiera.
- Si la implementacion requiere mas contexto, actualizar esta seccion antes
  de ampliar la lectura.

## Fuentes De Verdad

- Configuracion activa: `/home/miguel/.config/opencode/`.
- Backup versionado: raiz de este repositorio y su `README.md`.
- Esquema oficial: `https://opencode.ai/config.json`.
- Documentacion oficial de agentes, modelos, compaction, plugins y permisos de
  OpenCode.
- Catalogo activo de modelos obtenido con `opencode models`.
- Metricas: `~/.local/share/opencode/plugins-data/session-metrics.jsonl`.
- Informe local: `/home/miguel/Documentos/k3_tech_report.pdf`.
- Tests Node existentes en `tests/`.

## Criterios De Aceptacion

1. Ningun perfil ni agente configurado referencia `openai/gpt-4o` o
   `openai/gpt-4o-mini`.
2. `opencode debug config` resuelve cada perfil sin errores y muestra modelos
   validos del catalogo activo.
3. La configuracion efectiva no inyecta dos copias identicas de `AGENTS.md`.
4. Los perfiles `low`, `medium` y `max` tienen diferencias comprobables en
   modelo, esfuerzo, limites o superficie de herramientas.
5. El perfil ligero no carga herramientas opcionales de memoria, diagramas,
   contexto externo o tareas que no necesita.
6. El esfuerzo queda registrado en el 100% de las sesiones nuevas y no aparece
   como `unset` en las metricas normales.
7. Las metricas cuentan deltas por sesion y no vuelven a sumar contadores
   acumulados en cada mensaje.
8. Las metricas detectan lecturas amplias con los nombres reales de las tools y
   argumentos usados por OpenCode.
9. Los tests de metricas fallan ante una regresion real y pasan con la
   implementacion corregida; no se aceptan aserciones vacias.
10. La verificacion de cambios Tier 2 y Tier 3 conserva un verificador
    independiente y limita los ciclos para evitar bucles de tokens.
11. El ruteo local solo recibe tareas acotadas y nunca secretos; las tareas
    criticas permanecen en el modelo cloud actual.
12. Ningun cambio de esta feature integra, prueba o selecciona Kimi K3.
13. La documentacion del backup refleja la configuracion final y los comandos
    de reinicio y verificacion.

## Riesgos

- Reducir herramientas puede impedir una tarea valida; se mitiga con escalado
  explicito y perfiles diferenciados.
- Reducir `tail_turns` puede perder contexto util; se mitiga con `/handoff` y
  medicion de reintentos.
- Cambiar modelos puede alterar calidad; se mide por tarea verificada, no solo
  por tokens.
- Cambiar plugins puede afectar memoria o receipts; se ejecutan tests de
  plugins y se conserva el backup automatico.
- La configuracion activa y el backup pueden divergir; se valida con diff y
  sincronizacion controlada.

## Preguntas Abiertas

- Ninguna para el alcance aprobado. La decision de no experimentar con K3 es
  obligatoria y no debe reabrirse durante esta implementacion.
