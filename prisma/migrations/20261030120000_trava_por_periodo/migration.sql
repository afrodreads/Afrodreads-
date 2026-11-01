-- Trava de agenda por período (manhã ou tarde) além do dia inteiro.
-- fullDay = true continua sendo o dia inteiro; com fullDay = false, "period" diz qual período está travado.
-- Só adiciona uma coluna opcional: bloqueios existentes continuam iguais.
ALTER TABLE "BlockedDate" ADD COLUMN "period" "DayPeriod";
