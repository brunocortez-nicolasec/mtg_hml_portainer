// material-react-app/src/layouts/observabilidade/politicas/components/RbacTab.js

import { useState, useEffect } from "react";
import axios from "axios";
import PropTypes from 'prop-types'; 

// @mui material components
import Icon from "@mui/material/Icon";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDSnackbar from "components/MDSnackbar";

// Hook do Contexto Principal
import { useMaterialUIController } from "context";

// Componentes RBAC customizados
import RbacTable from "./rbac/RbacTable";
import RbacModal from "./rbac/RbacModal";

function RbacTab({ allSystems, allResources, allAttributes }) { 
  const [controller] = useMaterialUIController();
  const { token } = controller;

  const [loadingData, setLoadingData] = useState(true);
  const [rbacRules, setRbacRules] = useState([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  
  const [snackbar, setSnackbar] = useState({ open: false, color: "info", title: "", message: "" });

  const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const showSnackbar = (color, title, message) => setSnackbar({ open: true, color, title, message });

  // --- CORREÇÃO: URL CORRETA ---
  const API_URL = process.env.REACT_APP_API_URL;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  const fetchInitialData = async () => {
    if (!token) return;
    setLoadingData(true);
    try {
      const rulesRes = await api.get("/rbac-rules");
      // Blindagem de Array
      const data = rulesRes.data;
      setRbacRules(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar dados RBAC:", error);
      setRbacRules([]); // Garante array vazio
      showSnackbar("error", "Erro de Rede", "Falha ao carregar regras RBAC.");
    } finally {
      setLoadingData(false);
    }
  };

  useEffect(() => {
    if (token) fetchInitialData();
  }, [token]);

  const handleOpenModal = (rule = null) => {
    setEditingRule(rule);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRule(null);
  };

  const handleDelete = async (ruleId) => {
    if (window.confirm("Tem certeza que deseja deletar esta regra RBAC?")) {
      try {
        await api.delete(`/rbac-rules/${ruleId}`);
        showSnackbar("success", "Sucesso", "Regra RBAC deletada.");
        fetchInitialData(); 
      } catch (error) {
        console.error("Erro ao deletar regra RBAC:", error);
        const message = error.response?.data?.message || "Erro ao deletar.";
        showSnackbar("error", "Erro ao Deletar", message);
      }
    }
  };

  return (
    <>
      <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <MDTypography variant="h5">Gerenciar Regras de RBAC</MDTypography>
        <MDButton variant="gradient" color="info" onClick={() => handleOpenModal(null)}>
          <Icon sx={{ mr: 1 }}>add</Icon>
          Adicionar Regra
        </MDButton>
      </MDBox>

      <RbacTable
        loading={loadingData}
        rules={rbacRules}
        resources={allResources} 
        attributes={allAttributes} 
        onEdit={handleOpenModal}
        onDelete={handleDelete}
      />

      <RbacModal
        open={isModalOpen}
        onClose={handleCloseModal}
        onRefresh={fetchInitialData} 
        showSnackbar={showSnackbar}
        token={token}
        ruleToEdit={editingRule}
        systems={allSystems} 
        resources={allResources} 
        attributes={allAttributes} 
      />
      
      <MDSnackbar
        color={snackbar.color}
        icon={snackbar.color === "success" ? "check" : "warning"}
        title={snackbar.title}
        content={snackbar.message}
        dateTime="agora"
        open={snackbar.open}
        onClose={closeSnackbar}
        close={closeSnackbar}
      />
    </>
  );
}

RbacTab.propTypes = {
  allSystems: PropTypes.arrayOf(PropTypes.object).isRequired,
  allResources: PropTypes.arrayOf(PropTypes.object).isRequired, 
  allAttributes: PropTypes.arrayOf(PropTypes.object).isRequired,
};

export default RbacTab;