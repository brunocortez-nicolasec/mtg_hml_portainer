// src/layouts/administrar/pacotes/index.js

import { useState, useEffect } from "react";
import axios from "axios";

import Collapse from "@mui/material/Collapse";
import AddPackageModal from "./components/AddPackageModal";
import EditPackageModal from "./components/EditPackageModal"; 

import AdminPageLayout from "layouts/administrar/components/AdminPageLayout";
import DataTable from "examples/Tables/DataTable";
import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";
import MDAlert from "components/MDAlert";
import packagesTableData from "./data/packagesTableData";

function GerenciarPacotes() {
  const [packages, setPackages] = useState([]);
  const [tableData, setTableData] = useState({ columns: [], rows: [] });
  const [loading, setLoading] = useState(true);
  const [notification, setNotification] = useState({ show: false, color: "info", message: "" });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState(null);

  // --- CORREÇÃO: URL CORRETA ---
  const API_URL = process.env.REACT_APP_API_URL;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchPackages = async () => {
    try {
      setLoading(true);
      const response = await api.get("/packages");
      // Blindagem de Array
      const data = response.data;
      setPackages(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Erro ao buscar pacotes:", error);
      setPackages([]); // Garante array vazio
      setNotification({ show: true, color: "error", message: "Erro ao carregar pacotes." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
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
    // packages já é garantido ser um array
    const formattedData = packagesTableData(packages, handleEditClick, handleDeleteClick);
    setTableData(formattedData);
  }, [packages]);
  
  const handleAddPackageClick = () => setIsAddModalOpen(true);
  const handleCloseAddModal = () => setIsAddModalOpen(false);

  const handleEditClick = (pkg) => {
    setSelectedPackage(pkg);
    setIsEditModalOpen(true);
  };
  const handleCloseEditModal = () => {
    setSelectedPackage(null);
    setIsEditModalOpen(false);
  };

  const handleCreatePackage = async (newPackageData) => {
    try {
      await api.post("/packages", newPackageData);
      setNotification({ show: true, color: "success", message: "Pacote criado com sucesso!" });
      fetchPackages();
      handleCloseAddModal(); // Fecha modal após sucesso
    } catch (error) {
      const message = error.response?.data?.message || "Erro ao criar pacote.";
      setNotification({ show: true, color: "error", message });
    }
  };
  
  const handleUpdatePackage = async (packageId, updatedData) => {
    try {
      await api.patch(`/packages/${packageId}`, updatedData);
      setNotification({ show: true, color: "success", message: "Pacote atualizado com sucesso!" });
      fetchPackages();
      handleCloseEditModal(); // Fecha modal após sucesso
    } catch (error) {
      const message = error.response?.data?.message || "Erro ao atualizar pacote.";
      setNotification({ show: true, color: "error", message });
    }
  };

  const handleDeleteClick = async (packageId) => {
    if (window.confirm("Tem certeza que deseja deletar este pacote?")) {
      try {
        await api.delete(`/packages/${packageId}`);
        setNotification({ show: true, color: "success", message: "Pacote deletado com sucesso!" });
        fetchPackages();
      } catch (error) {
        const message = error.response?.data?.message || "Erro ao deletar pacote.";
        setNotification({ show: true, color: "error", message });
      }
    }
  };

  return (
    <AdminPageLayout
      title="Gerenciamento de Pacotes"
      buttonText="Adicionar Pacote"
      onButtonClick={handleAddPackageClick}
    >
      <MDBox mt={2} mb={2}>
        <Collapse in={notification.show}>
          <MDAlert color={notification.color}>
            <MDTypography variant="body2" color="white">{notification.message}</MDTypography>
          </MDAlert>
        </Collapse>
      </MDBox>

      {loading ? (
        <MDTypography variant="body2" textAlign="center">Carregando pacotes...</MDTypography>
      ) : (
        <DataTable table={tableData} isSorted={false} entriesPerPage={false} showTotalEntries={false} noEndBorder />
      )}
      
      <AddPackageModal
        open={isAddModalOpen}
        onClose={handleCloseAddModal}
        onSave={handleCreatePackage}
      />
      
      <EditPackageModal
        open={isEditModalOpen}
        onClose={handleCloseEditModal}
        onSave={handleUpdatePackage}
        pkg={selectedPackage}
      />

    </AdminPageLayout>
  );
}

export default GerenciarPacotes;