import { useMemo } from "react";

function useDashboardData(metrics, isLoading) {
  const displayData = useMemo(() => {
    // ======================= DEFINIÇÃO SEGURA DOS DADOS PADRÃO =======================
    const defaultData = {
        imDisplay: {
            pills: { total: 0, ativos: 0, inativos: 0, desconhecido: 0 },
            tiposChart: { labels: [], datasets: { data: [] } },
            tiposList: [],
            divergencias: { 
                inativosRHAtivosApp: 0, 
                cpf: 0, 
                email: 0, 
                acessoPrevistoNaoConcedido: 0, 
                nome: 0,
                ativosNaoEncontradosRH: 0,
                sodViolations: 0,
            },
            kpisAdicionais: { contasDormentes: 0, acessoPrivilegiado: 0, adminsDormentes: 0 },
        },
        pamDisplay: { riscos: { acessosIndevidos: 0 } },
        riscosConsolidadosChart: { 
            labels: ["Contas Admin com Risco", "Acessos Ativos Indevidos", "Contas Órfãs", "Violações de SOD"], 
            datasets: [{ label: "Total de Eventos de Risco", color: "error", data: [0, 0, 0, 0] }] 
        },
        prejuizoPotencial: "R$ 0,00",
        prejuizoMitigado: "R$ 0,00",
        indiceConformidade: isLoading ? "..." : "100.0",
        riscosEmContasPrivilegiadas: 0,
        sodViolationCount: 0,
    };
    // =================================================================================

    // Se metrics for nulo/undefined, retorna o padrão imediatamente para evitar crashes
    if (!metrics) {
        return defaultData;
    }
    
    // --- BLINDAGEM DE ARRAYS E OBJETOS ---
    // Garante que tiposDeUsuario seja sempre um array, mesmo que venha undefined
    const safeTiposDeUsuario = Array.isArray(metrics.tiposDeUsuario) ? metrics.tiposDeUsuario : [];
    const safePills = metrics.pills || defaultData.imDisplay.pills;
    const safeKpis = metrics.kpisAdicionais || defaultData.imDisplay.kpisAdicionais;
    const safeDivergencias = metrics.divergencias || {};
    const safeRiscos = metrics.riscos || {};
    const safePamRiscos = metrics.pamRiscos || defaultData.pamDisplay.riscos;

    const imDisplay = {
        pills: safePills,
        tiposChart: {
            // Agora usamos o array seguro 'safeTiposDeUsuario'
            labels: safeTiposDeUsuario.map(t => t.tipo || "Desconhecido"),
            datasets: {
                label: "Tipos de Usuário",
                backgroundColors: ["info", "primary", "warning", "secondary", "error", "light"],
                data: safeTiposDeUsuario.map(t => t.total || 0),
            },
        },
        tiposList: safeTiposDeUsuario.map(t => ({ label: t.tipo, value: t.total })),
        kpisAdicionais: safeKpis,
        divergencias: { ...defaultData.imDisplay.divergencias, ...safeDivergencias },
    };

    const riscosConsolidadosChart = {
        labels: ["Contas Admin com Risco", "Acessos Ativos Indevidos", "Contas Órfãs", "Violações de SOD"],
        datasets: [{
            label: "Total de Eventos de Risco",
            color: "error",
            data: [
                safeRiscos.riscosEmContasPrivilegiadas || 0,
                safeDivergencias.inativosRHAtivosApp || 0,
                safeDivergencias.ativosNaoEncontradosRH || 0,
                safeRiscos.sodViolationCount || 0,
            ]
        }]
    };
    
    return { 
        imDisplay,
        pamDisplay: { riscos: safePamRiscos },
        riscosConsolidadosChart,
        prejuizoPotencial: safeRiscos.prejuizoPotencial || "R$ 0,00",
        prejuizoMitigado: safeRiscos.valorMitigado || "R$ 0,00",
        // Usa nullish coalescing (??) para aceitar 0 como valor válido
        indiceConformidade: safeRiscos.indiceConformidade ?? "100.0",
        riscosEmContasPrivilegiadas: safeRiscos.riscosEmContasPrivilegiadas || 0,
    };
  }, [metrics, isLoading]);

  return displayData;
}

export default useDashboardData;