import React from "react";
import PropTypes from "prop-types";

// Componentes do Template
import Card from "@mui/material/Card";
import VerticalBarChart from "examples/Charts/BarCharts/VerticalBarChart";

function RisksChartCard({ chart, onClick, hasRisk }) {
  // --- BLINDAGEM ---
  // Se os dados do gráfico não estiverem prontos, não renderiza nada (evita crash interno do Chart)
  if (!chart || !chart.datasets) return null;

  return (
    <Card sx={{ height: "100%" }}>
      <VerticalBarChart
        icon={{
          color: hasRisk ? "error" : "success",
          component: hasRisk ? "warning" : "check_circle",
        }}
        title="Visão Geral de Riscos"
        description="Principais pontos de atenção consolidados"
        chart={chart}
        onClick={onClick}
      />
    </Card>
  );
}

RisksChartCard.propTypes = {
  chart: PropTypes.object, // Removido isRequired para aceitar null durante loading
  onClick: PropTypes.func.isRequired,
  hasRisk: PropTypes.bool,
};

RisksChartCard.defaultProps = {
  chart: null,
  hasRisk: false,
};

export default RisksChartCard;