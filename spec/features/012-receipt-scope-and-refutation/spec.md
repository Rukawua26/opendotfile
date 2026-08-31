# Feature 012: Receipt Scope And Refutation

## Problema

Los receipts sucesores permiten crear un segunda revision tras cambiar el candidato,
pero no impiden ampliar silenciosamente el manifest ni encadenar intentos sin
limite. Ademas, el agente `review-refuter` existe, pero Organic RDD no puede
registrar su evidencia contra el receipt congelado.

## Objetivo

Convertir el lineage en una correccion humana trazable y acotada, y permitir
capturar opcionalmente un refuter de solo lectura sin aumentar el coste normal
de las revisiones.

## Alcance

- Exigir que un receipt con `parent_review_id` contenga exactamente los mismos
  paths del parent, permitiendo cambiar bytes pero no ampliar ni reducir el
  alcance.
- Limitar una cadena de antepasados a dos intentos: receipt inicial y una
  correccion sucesora.
- Aceptar `refuter` como lens opcional de captura, sin anadirlo a
  `required_lenses` por defecto.
- Conservar receipts legacy y los cuatro lenses obligatorios existentes.
- Registrar pruebas para scope, intentos, refuter opcional y compatibilidad.

## Fuera De Alcance

- Autocorreccion escrita por agentes.
- Event sourcing, firmas remotas, CI o gates de release nuevos.
- Routing dinamico de lenses basado en el refuter.
- Revalidacion delta automatica de codigo.
- Cambios de schema aditivos para clasificacion causal.

## Criterios De Aceptacion

- AC-1: Un successor con paths distintos del parent es rechazado con un error
  determinista.
- AC-2: Un successor con los mismos paths y bytes corregidos conserva lineage.
- AC-3: Un tercer intento de una misma cadena es rechazado.
- AC-4: Un intent explicito no puede saltarse el limite ni retroceder.
- AC-5: `refuter` puede capturarse como lens opcional con evidencia y metadata.
- AC-6: `refuter` no aparece en `required_lenses` ni es requerido para aprobar
  una revision sin hallazgos.
- AC-7: Una captura fallida del refuter bloquea el receipt como cualquier lens.
- AC-8: Receipts anteriores sin `refuter` y con lineage valido siguen leyendose.
- AC-9: La suite Node y shell relevantes pasan.

## Riesgo

Tier 3: cambia contrato de receipts, validacion de lineage y permisos del plugin.
