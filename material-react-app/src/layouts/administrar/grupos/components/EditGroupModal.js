// src/layouts/administrar/grupos/components/EditGroupModal.js

import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import axios from "axios";

// Componentes do template
import DataTable from "examples/Tables/DataTable";
import Autocomplete from "@mui/material/Autocomplete";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";

import membersListTableData from "../data/membersListTableData";

function EditGroupModal({ open, onClose, onSave, group }) {
  const [name, setName] = useState("");
  const [members, setMembers] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [userToAdd, setUserToAdd] = useState(null);

  // --- CORREÇÃO: URL CORRETA ---
  const API_URL = process.env.REACT_APP_API_URL;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  useEffect(() => {
    const fetchData = async () => {
      if (!group) return;
      setLoading(true);
      try {
        const [usersResponse, groupDetailsResponse] = await Promise.all([
          api.get("/users"),
          api.get(`/groups/${group.id}`),
        ]);
        // Blindagem básica
        setAllUsers(Array.isArray(usersResponse.data) ? usersResponse.data : []);
        setName(groupDetailsResponse.data.name);
        setMembers(groupDetailsResponse.data.users || []);
      } catch (error) {
        console.error("Erro ao buscar dados para o modal:", error);
        setAllUsers([]);
      } finally {
        setLoading(false);
      }
    };
    if (open) {
      fetchData();
      setSearchText("");
      setUserToAdd(null);
    }
  }, [open, group]);

  const handleRemoveMember = (userIdToRemove) => {
    setMembers((currentMembers) => currentMembers.filter((member) => member.id !== userIdToRemove));
  };

  const handleSave = () => {
    const userIds = members.map((member) => member.id);
    onSave(group.id, { name, userIds });
    onClose();
  };

  const filteredMembers = members.filter((member) =>
    member.name?.toLowerCase().includes(searchText.toLowerCase())
  );

  const tableData = useMemo(
    () => membersListTableData(filteredMembers, handleRemoveMember),
    [filteredMembers]
  );

  const usersAvailableToAdd = useMemo(
    () => allUsers.filter((user) => !members.some((member) => member.id === user.id)),
    [allUsers, members]
  );

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Editar Grupo</DialogTitle>
      <DialogContent>
        <MDBox component="form" role="form" pt={2}>
          <MDBox mb={2}>
            <MDInput
              type="text"
              label="Nome do Grupo"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </MDBox>
          <MDTypography variant="h6" fontWeight="medium">
            Membros Atuais
          </MDTypography>
          <MDBox my={2}>
            <MDInput
              type="text"
              label="Pesquisar na lista de membros..."
              fullWidth
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </MDBox>

          {loading ? (
            <MDTypography variant="body2" textAlign="center">
              Carregando...
            </MDTypography>
          ) : (
            <MDBox sx={{ maxHeight: 300, overflow: "auto" }}>
              <DataTable
                table={tableData}
                isSorted={false}
                entriesPerPage={false}
                showTotalEntries={false}
                noEndBorder
              />
            </MDBox>
          )}

          <MDTypography variant="h6" fontWeight="medium" mt={4}>
            Adicionar Novo Membro
          </MDTypography>
          <MDBox mt={2}>
            <Autocomplete
              options={usersAvailableToAdd}
              getOptionLabel={(option) => option.name}
              value={userToAdd}
              onChange={(event, newValue) => {
                if (newValue) {
                  setMembers((currentMembers) => [...currentMembers, newValue]);
                  setUserToAdd(null);
                }
              }}
              renderInput={(params) => (
                <MDInput {...params} label="Pesquisar usuário para adicionar..." />
              )}
            />
          </MDBox>
        </MDBox>
      </DialogContent>
      <DialogActions>
        <MDButton onClick={onClose} color="secondary">
          Cancelar
        </MDButton>
        <MDButton onClick={handleSave} color="info">
          Salvar Alterações
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

EditGroupModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  group: PropTypes.object,
};

export default EditGroupModal;