// src/layouts/administrar/grupos/components/AddGroupModal.js

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import Autocomplete from "@mui/material/Autocomplete";
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDBox from "components/MDBox";

function AddGroupModal({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);

  // --- CORREÇÃO: URL CORRETA ---
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const api = axios.create({
          baseURL: API_URL,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const response = await api.get("/users");
        const data = response.data;
        // Blindagem de Array
        setAllUsers(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao buscar usuários para o modal:", error);
        setAllUsers([]);
      }
    };

    if (open) {
      fetchUsers();
      setName("");
      setSelectedUsers([]);
    }
  }, [open]);

  const handleSave = () => {
    const userIds = selectedUsers.map(user => user.id);
    onSave({ name, userIds });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Adicionar Novo Grupo</DialogTitle>
      <DialogContent>
        <MDBox component="form" role="form" pt={2}>
          <MDBox mb={2}>
            <MDInput
              type="text"
              label="Nome do Grupo"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </MDBox>
          <MDBox mb={2}>
            <Autocomplete
              multiple
              options={allUsers}
              getOptionLabel={(option) => option.name}
              value={selectedUsers}
              onChange={(event, newValue) => {
                setSelectedUsers(newValue);
              }}
              renderInput={(params) => (
                <MDInput {...params} label="Membros do Grupo" />
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
          Salvar
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

AddGroupModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default AddGroupModal;