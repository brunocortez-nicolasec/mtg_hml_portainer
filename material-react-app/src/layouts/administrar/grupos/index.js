// src/layouts/administrar/grupos/index.js

import { useState, useEffect } from "react";
import axios from "axios";

import Collapse from "@mui/material/Collapse";
import AddGroupModal from "./components/AddGroupModal";
import EditGroupModal from "./components/EditGroupModal";
import ViewMembersModal from "./components/ViewMembersModal";

import AdminPageLayout from "layouts/administrar/components/AdminPageLayout";
import DataTable from "examples/Tables/DataTable";
import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";
import MDAlert from "components/MDAlert";
import groupsTableData from "./data/groupsTableData";

function GerenciarGrupos() {
  const [groups, setGroups] = useState([]);
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, color: "info", message: "" });
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState(null);

  // --- CORREÇÃO: URL CORRETA ---
  const API_URL = process.env.REACT_APP_API_URL;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const response = await api.get("/groups");
      // Blindagem de Array
      const data = response.data;
      setGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar grupos:", error);
      setGroups([]); // Garante array vazio
      setNotification({ show: true, color: "error", message: "Erro ao carregar grupos." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
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
    // groups já é garantido ser um array
    const formattedData = groupsTableData(
      groups,
      handleViewClick,
      handleEditClick,
      handleDeleteClick
    );
    setTableData(formattedData);
  }, [groups]);

  const handleAddGroupClick = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);
  const handleEditClick = (group) => {
    setSelectedGroup(group);
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setSelectedGroup(null);
    setIsEditModalOpen(false);
  };
  const handleViewClick = (group) => {
    setSelectedGroup(group);
    setIsViewModalOpen(true);
  };
  const handleCloseViewModal = () => {
    setSelectedGroup(null);
    setIsViewModalOpen(false);
  };

  const handleCreateGroup = async (newGroupData) => {
    try {
      await api.post("/groups", newGroupData);
      setNotification({ show: true, color: "success", message: "Grupo criado com sucesso!" });
      fetchGroups();
      handleCloseAddModal(); // Fecha modal
    } catch (error) {
      const message = error.response?.data?.message || "Erro ao criar o grupo.";
      setNotification({ show: true, color: "error", message });
    }
  };

  const handleUpdateGroup = async (groupId, updatedData) => {
    try {
      await api.patch(`/groups/${groupId}`, updatedData);
      setNotification({ show: true, color: "success", message: "Grupo atualizado com sucesso!" });
      fetchGroups();
      handleCloseEditModal(); // Fecha modal
    } catch (error) {
      console.error("Erro ao salvar grupo:", error);
      const message = error.response?.data?.message || "Erro ao atualizar o grupo.";
      setNotification({ show: true, color: "error", message });
    }
  };

  const handleDeleteClick = async (groupId) => {
    if (window.confirm("Tem certeza que deseja deletar este grupo?")) {
      try {
        await api.delete(`/groups/${groupId}`);
        setNotification({ show: true, color: "success", message: "Grupo deletado com sucesso!" });
        fetchGroups();
      } catch (error) {
        const message = error.response?.data?.message || "Erro ao deletar o grupo.";
        setNotification({ show: true, color: "error", message });
      }
    }
  };

  return (
    <AdminPageLayout
      title="Gerenciamento de Grupos"
      buttonText="Adicionar Grupo"
      onButtonClick={handleAddGroupClick}
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
        <MDTypography variant="body2" textAlign="center">
          Carregando grupos...
        </MDTypography>
      ) : (
        <DataTable
          table={tableData}
          isSorted={false}
          entriesPerPage={false}
          showTotalEntries={false}
          noEndBorder
        />
      )}

      <AddGroupModal open={isAddModalOpen} onClose={handleCloseAddModal} onSave={handleCreateGroup} />
      <EditGroupModal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleUpdateGroup}
        group={selectedGroup}
      />
      <ViewMembersModal
        open={isViewModalOpen}
        onClose={handleCloseViewModal}
        group={selectedGroup}
      />
    </AdminPageLayout>
  );
}

export default GerenciarGrupos;