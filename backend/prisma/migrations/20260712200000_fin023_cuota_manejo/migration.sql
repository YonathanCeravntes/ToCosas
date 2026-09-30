-- FIN-023 (DEC-0023 P1 Alt A): la cuota de manejo es un cargo bancario que el
-- USUARIO registra (sin default en ninguna capa). Convive en debt_insurances
-- con la maquinaria financiado/aparte ya auditada de FIN-013.
ALTER TYPE "DebtInsuranceKind" ADD VALUE IF NOT EXISTS 'cuota_manejo';
