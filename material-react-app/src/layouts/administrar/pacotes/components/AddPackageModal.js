// src/layouts/administrar/pacotes/components/AddPackageModal.js

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

function AddPackageModal({ open, onClose, onSave }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [allPlatforms, setAllPlatforms] = useState([]);
  const [selectedPlatforms, setSelectedPlatforms] = useState([]);

  // --- CORREÇÃO: URL CORRETA ---
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchPlatforms = async () => {
      try {
        const api = axios.create({
          baseURL: API_URL,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const response = await api.get("/platforms");
        const data = response.data;
        // Blindagem de Array
        setAllPlatforms(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Erro ao buscar plataformas:", error);
        setAllPlatforms([]); // Garante array vazio
      }
    };

    if (open) {
      fetchPlatforms();
      setName("");
      setDescription("");
      setSelectedPlatforms([]);
    }
  }, [open]);

  const handleSave = () => {
    const platformIds = selectedPlatforms.map(p => p.id);
    onSave({ name, description, platformIds });
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Adicionar Novo Pacote</DialogTitle>
      <DialogContent>
        <MDBox component="form" role="form" pt={2}>
          <MDBox mb={2}>
            <MDInput
              type="text"
              label="Nome do Pacote"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </MDBox>
          <MDBox mb={2}>
            <MDInput
              type="text"
              label="Descrição (Opcional)"
              fullWidth
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </MDBox>
          <MDBox mb={2}>
            <Autocomplete
              multiple
              options={allPlatforms}
              getOptionLabel={(option) => option.name}
              value={selectedPlatforms}
              onChange={(event, newValue) => {
                setSelectedPlatforms(newValue);
              }}
              renderInput={(params) => (
                <MDInput {...params} label="Plataformas Inclusas" />
              )}
            />
          </MDBox>
        </MDBox>
      </DialogContent>
      <DialogActions>
        <MDButton onClick={onClose} color="secondary">Cancelar</MDButton>
        <MDButton onClick={handleSave} color="info">Salvar</MDButton>
      </DialogActions>
    </Dialog>
  );
}

AddPackageModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
};

export default AddPackageModal;