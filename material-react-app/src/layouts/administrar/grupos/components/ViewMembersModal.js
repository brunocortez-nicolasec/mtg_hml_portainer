// src/layouts/administrar/grupos/components/ViewMembersModal.js

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";

import Dialog from "@mui/material/Dialog";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import DialogActions from "@mui/material/DialogActions";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDBox from "components/MDBox";
import DataTable from "examples/Tables/DataTable";
import MDTypography from "components/MDTypography";

import membersTableData from "../data/membersTableData.js";

function ViewMembersModal({ open, onClose, group }) {
  const [members, setMembers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);

  // --- CORREÇÃO: URL CORRETA ---
  const API_URL = process.env.REACT_APP_API_URL;

  useEffect(() => {
    const fetchGroupDetails = async () => {
      if (!group) return;

      setLoading(true);
      try {
        const api = axios.create({
          baseURL: API_URL,
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        const response = await api.get(`/groups/${group.id}`);
        // Blindagem de Array
        setMembers(response.data.users || []);
      } catch (error) {
        console.error("Erro ao buscar membros do grupo:", error);
        setMembers([]);
      } finally {
        setLoading(false);
      }
    };

    if (open) {
      fetchGroupDetails();
      setSearchText("");
    }
  }, [open, group]);
  
  // Safe filter
  const filteredMembers = (members || []).filter(member =>
    member.name?.toLowerCase().includes(searchText.toLowerCase())
  );
  
  const { columns, rows } = membersTableData(filteredMembers);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Membros do Grupo: {group?.name}</DialogTitle>
      <DialogContent>
        <MDBox pt={2}>
          <MDInput
            label="Pesquisar por nome..."
            fullWidth
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </MDBox>
        <MDBox pt={2}>
          {loading ? (
             <MDTypography variant="body2" textAlign="center">Carregando membros...</MDTypography>
          ) : (
            <DataTable table={{ columns, rows }} isSorted={false} entriesPerPage={false} showTotalEntries={false} noEndBorder />
          )}
        </MDBox>
      </DialogContent>
       <DialogActions>
        <MDButton onClick={onClose} color="info">
          Fechar
        </MDButton>
      </DialogActions>
    </Dialog>
  );
}

ViewMembersModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  group: PropTypes.object,
};

export default ViewMembersModal;