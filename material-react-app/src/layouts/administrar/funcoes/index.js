// material-react-app/src/layouts/administrar/funcoes/index.js

import { useState, useEffect } from "react";
import axios from "axios";

import Collapse from "@mui/material/Collapse";
import AddRoleModal from "./components/AddRoleModal";
import EditRoleModal from "./components/EditRoleModal";
import AdminPageLayout from "layouts/administrar/components/AdminPageLayout";
import DataTable from "examples/Tables/DataTable";
import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";
import MDAlert from "components/MDAlert";
import rolesTableData from "./data/rolesTableData";

function GerenciarFuncoes() {
  const [roles, setRoles] = useState([]);
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, color: "info", message: "" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);

  const API_URL = process.env.REACT_APP_API_URL;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchRoles = async () => {
    try {
      setLoading(true);
      // --- CORRIGIDO ---
      const response = await api.get("/profiles"); // De /roles para /profiles
      // Blindagem de Array
      const data = response.data;
      setRoles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar funções:", error);
      setRoles([]); // Garante array vazio
      setNotification({ show: true, color: "error", message: "Erro ao carregar funções." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoles();
  }, []);

  useEffect(() => {
    if (notification.show) {
      const timer = setTimeout(() => {
        setNotification((prevState) => ({ ...prevState, show: false }));
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    // roles já é garantido ser um array
    const formattedData = rolesTableData(roles, handleEditClick, handleDeleteClick);
    setTableData(formattedData);
  }, [roles]);

  const handleAddRoleClick = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);
  const handleEditClick = (role) => {
    setSelectedRole(role);
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setSelectedRole(null);
    setIsEditModalOpen(false);
  };

  const handleCreateRole = async (newRoleData) => {
    try {
      // --- CORRIGIDO ---
      await api.post("/profiles", newRoleData); // De /roles para /profiles
      setNotification({ show: true, color: "success", message: "Função criada com sucesso!" });
      fetchRoles();
      handleCloseAddModal(); // Fecha modal após sucesso
    } catch (error) {
      const message = error.response?.data?.message || "Erro ao criar a função.";
      setNotification({ show: true, color: "error", message });
    }
  };

  const handleUpdateRole = async (roleId, updatedData) => {
    try {
      // --- CORRIGIDO ---
      await api.patch(`/profiles/${roleId}`, updatedData); // De /roles para /profiles
      setNotification({ show: true, color: "success", message: "Função atualizada com sucesso!" });
      fetchRoles();
      handleCloseEditModal(); // Fecha modal após sucesso
    } catch (error) {
      const message = error.response?.data?.message || "Erro ao atualizar a função.";
      setNotification({ show: true, color: "error", message });
    }
  };

  const handleDeleteClick = async (roleId) => {
    if (window.confirm("Tem certeza que deseja deletar esta função? Esta ação é irreversível.")) {
      try {
        // --- CORRIGIDO ---
        await api.delete(`/profiles/${roleId}`); // De /roles para /profiles
        setNotification({ show: true, color: "success", message: "Função deletada com sucesso!" });
        fetchRoles();
      } catch (error) {
        const message = error.response?.data?.message || "Erro ao deletar a função.";
        setNotification({ show: true, color: "error", message });
      }
    }
  };

  return (
    <AdminPageLayout
      title="Gerenciamento de Funções"
      buttonText="Adicionar Função"
      onButtonClick={handleAddRoleClick}
    >
      <MDBox mt={2} mb={2}>
        <Collapse in={notification.show}>
          <MDAlert color={notification.color}>
            <MDTypography variant="body2" color="white">
              {notification.message}
            </MDTypography>
          </MDAlert>
        </Collapse>
      </MDBox>
      
      {loading ? (
        <MDTypography variant="body2" textAlign="center">Carregando funções...</MDTypography>
      ) : (
        <DataTable table={tableData} isSorted={false} entriesPerPage={false} showTotalEntries={false} noEndBorder />
      )}
      
      <AddRoleModal 
        open={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleCreateRole}
      />

      <EditRoleModal 
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleUpdateRole}
        role={selectedRole}
      />
      
    </AdminPageLayout>
  );
}

export default GerenciarFuncoes;