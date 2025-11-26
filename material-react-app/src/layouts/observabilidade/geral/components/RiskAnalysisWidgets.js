// material-react-app/src/layouts/observabilidade/geral/components/RiskAnalysisWidgets.js

import React from "react";
import PropTypes from "prop-types";

import Card from "@mui/material/Card";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

function RiskAnalysisWidgets({ title, items, defaultColor = "dark", onItemClick }) {
  // --- BLINDAGEM: Garante que é sempre um array ---
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <Card sx={{ height: "100%" }}>
      <MDBox pt={2} px={2} textAlign="center">
        <MDTypography variant="button" fontWeight="bold" textTransform="uppercase" color="secondary">
          {title}
        </MDTypography>
      </MDBox>
      <MDBox p={2} pt={0}>
        {safeItems.map((item) => (
          <MDBox
            key={item.label}
            mt={2.5}
            lineHeight={1}
            textAlign="center"
            onClick={() => item.code && item.value > 0 && onItemClick(item.code, item.label)}
            sx={{
              cursor: item.code && item.value > 0 ? "pointer" : "default",
              borderRadius: '0.75rem',
              p: 1,
              transition: 'background-color 150ms ease-in-out',
              "&:hover": {
                backgroundColor: item.code && item.value > 0 ? 'action.hover' : 'transparent'
              }
            }}
          >
            <MDTypography variant="caption" color="text" fontWeight="light" textTransform="uppercase">
              {item.label}
            </MDTypography>
            <MDTypography variant="h3" fontWeight="bold" color={item.value > 0 ? (item.color || defaultColor) : "text"}>
              {item.value}
            </MDTypography>
          </MDBox>
        ))}
      </MDBox>
    </Card>
  );
}

RiskAnalysisWidgets.propTypes = {
  title: PropTypes.string.isRequired,
  items: PropTypes.arrayOf(PropTypes.shape({
    label: PropTypes.string.isRequired,
    value: PropTypes.number.isRequired,
    color: PropTypes.string,
    code: PropTypes.string,
  })), // Removido isRequired para flexibilidade
  defaultColor: PropTypes.string,
  onItemClick: PropTypes.func,
};

RiskAnalysisWidgets.defaultProps = {
  defaultColor: "dark",
  onItemClick: () => {},
  items: [], // Default seguro
};

export default RiskAnalysisWidgets;