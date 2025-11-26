// material-react-app/src/layouts/observabilidade/sistemas/components/SystemProfilesModal.js

import { useState, useEffect, useMemo } from "react";
import PropTypes from "prop-types";
import axios from "axios";

// @mui material components
import Dialog from "@mui/material/Dialog";
import DialogActions from "@mui/material/DialogActions";
import DialogContent from "@mui/material/DialogContent";
import DialogTitle from "@mui/material/DialogTitle";
import CircularProgress from "@mui/material/CircularProgress";
import DialogContentText from "@mui/material/DialogContentText";
import Tooltip from "@mui/material/Tooltip";
import Icon from "@mui/material/Icon"; 

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDButton from "components/MDButton";
import MDTypography from "components/MDTypography";
import MDSnackbar from "components/MDSnackbar";
import MDAlert from "components/MDAlert"; // <--- ADICIONADO (Estava faltando)
import DataTable from "examples/Tables/DataTable";
import MDBadge from "components/MDBadge";
import MDAvatar from "components/MDAvatar"; 
import defaultAvatar from "assets/images/default-avatar.jpg"; 

// Helper 'Author'
function Author({ image, name }) {
  return (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
      <MDAvatar src={image || defaultAvatar} name={name} size="sm" />
      <MDBox ml={2} lineHeight={1}>
        <MDTypography display="block" variant="button" fontWeight="medium">
          {name}
        </MDTypography>
      </MDBox>
    </MDBox>
  );
}
Author.propTypes = { image: PropTypes.string, name: PropTypes.string.isRequired };


function SystemProfilesModal({ open, onClose, dataSource, onDataClear }) {
  const [dataList, setDataList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isClearing, setIsClearing] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, color: "info", title: "", message: "" });

  const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });
  const showSnackbar = (color, title, message) => setSnackbar({ open: true, color, title, message });

  // --- CORREÇÃO AQUI: Força a URL correta em Produção ---
  const API_URL = process.env.REACT_APP_API_URL;

  const api = axios.create({
    baseURL: API_URL, // Agora aponta corretamente para /mind-the-gap/api
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });

  const fetchDataForSystem = async (signal) => {
    if (!open || !dataSource || !dataSource.id) {
      setDataList([]);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);
    setDataList([]);

    // A rota já está correta (/systems/:id/data), agora com a baseURL certa vai funcionar
    let url = `/systems/${dataSource.id}/data`; 

    try {
      const response = await api.get(url, { signal });
      setDataList(response.data || []);

    } catch (err) {
      if (!axios.isCancel(err)) {
        console.error(`Erro ao buscar dados para a fonte ${dataSource.name_datasource}:`, err);
        setError(err.response?.data?.message || `Não foi possível carregar os dados de ${dataSource.name_datasource}.`);
        setDataList([]);
      } else {
        console.log("Requisição de busca cancelada.");
      }
    } finally {
       if (!signal?.aborted) {
           setLoading(false);
       }
    }
  };

  useEffect(() => {
    const abortController = new AbortController();
    fetchDataForSystem(abortController.signal);

    return () => {
      abortController.abort();
    };
  }, [open, dataSource]); 

  const handleOpenConfirm = () => setIsConfirmOpen(true);
  const handleCloseConfirm = () => setIsConfirmOpen(false);

  const handleConfirmClear = async () => {
    if (!dataSource || isClearing) return;

    setIsClearing(true);
    handleCloseConfirm();

    try {
      await api.delete(`/systems/${dataSource.id}/data`);

      showSnackbar("success", "Sucesso", `Dados da fonte "${dataSource.name_datasource}" limpos.`);
      setDataList([]);
      
      if (onDataClear) {
        onDataClear();
      }

    } catch (err) {
        console.error(`Erro ao limpar dados da fonte ${dataSource.name_datasource}:`, err);
        showSnackbar("error", "Erro ao Limpar", err.response?.data?.message || "Não foi possível limpar os dados.");
    } finally {
        setIsClearing(false);
    }
  };

  const origem = dataSource?.origem_datasource;

  const columns = useMemo(() => {
    let baseColumns = [
      { 
        Header: "Nome", 
        accessor: "name", 
        Cell: ({ row: { original } }) => {
          const name = original.name_hr || original.name_idm || original.name_account || '-';
          const image = original.profile_image; 
          return <Author image={image} name={name} />;
        }
      },
      { 
        Header: "Email", 
        accessor: "email",
        Cell: ({ row: { original } }) => {
          const email = original.email_hr || original.email_idm || original.email_account || '-';
          return <MDTypography variant="caption">{email}</MDTypography>
        }
      },
      { 
        Header: "Status", 
        accessor: "status", 
        align: "center", 
        Cell: ({ row: { original } }) => {
          const status = original.status_hr || original.status_idm || original.status_account;
          return status ? 
            <MDBadge 
              badgeContent={status} 
              color={status.toLowerCase() === 'ativo' ? 'success' : 'error'} 
              variant="gradient" 
              size="sm" 
              container
            /> : 
            <MDTypography variant="caption">-</MDTypography>
        }
      },
    ];

    if (origem === "RH") {
      baseColumns.unshift({ 
        Header: "ID (RH)", 
        accessor: "identity_id_hr",
        Cell: ({value}) => <MDTypography variant="caption">{value}</MDTypography>
      });
      baseColumns.push({ 
        Header: "CPF", 
        accessor: "cpf_hr",
        Cell: ({value}) => <MDTypography variant="caption">{value || '-'}</MDTypography>
      });
    } else if (origem === "SISTEMA") {
      baseColumns.unshift({ 
        Header: "ID (Sistema)", 
        accessor: "id_in_system_account",
        Cell: ({value}) => <MDTypography variant="caption">{value}</MDTypography>
      });
    } else if (origem === "IDM") {
      baseColumns.unshift({ 
        Header: "ID (IDM)", 
        accessor: "identity_id_idm",
        Cell: ({value}) => <MDTypography variant="caption">{value}</MDTypography>
      });
    }
    
    return baseColumns;

  }, [origem]); 

  return (
    <>
      <Dialog open={open} onClose={onClose} fullWidth maxWidth="lg">
        <DialogTitle>Dados Processados de "{dataSource?.name_datasource || ''}"</DialogTitle>
        <DialogContent dividers sx={{ p: 0 }}>
          {loading && (
            <MDBox display="flex" justifyContent="center" alignItems="center" p={3}>
              <CircularProgress color="info" />
            </MDBox>
          )}
          {!loading && error && (
            <MDBox p={3}> 
              <MDAlert color="error">
                <MDTypography variant="body2" color="white">
                  Erro: {error}
                </MDTypography>
              </MDAlert>
            </MDBox>
          )}
          {!loading && !error && (
            <MDBox p={1}>
              <DataTable
                table={{ columns, rows: dataList }}
                isSorted={true}
                entriesPerPage={{ defaultValue: 10, entries: [5, 10, 20, 50] }}
                showTotalEntries
                noEndBorder
                canSearch
              />
            </MDBox>
          )}
        </DialogContent>
        <DialogActions sx={{ justifyContent: "space-between", px: 2, py: 1.5 }}>
          <Tooltip title={`Limpar todos os dados de "${dataSource?.name_datasource}"`}>
            <span>
              <MDButton
                onClick={handleOpenConfirm}
                color="error"
                variant="gradient" 
                disabled={loading || isClearing || dataList.length === 0}
              >
                {isClearing ? "Limpando..." : "Limpar Dados"}
              </MDButton>
            </span>
          </Tooltip>
          <MDButton onClick={onClose} color="secondary" disabled={isClearing}>
            Fechar
          </MDButton>
        </DialogActions>
      </Dialog>

      {/* Diálogo de Confirmação */}
      <Dialog open={isConfirmOpen} onClose={handleCloseConfirm}>
          <DialogTitle>Confirmar Limpeza</DialogTitle>
          <DialogContent>
              <DialogContentText>
                  Você tem certeza que deseja excluir **TODOS os dados** associados à fonte "{dataSource?.name_datasource || ''}"?
                  <br/>
                  Esta ação **não pode ser desfeita**.
              </DialogContentText>
          </DialogContent>
          <DialogActions>
              <MDButton onClick={handleCloseConfirm} color="secondary">
                  Cancelar
              </MDButton>
              <MDButton onClick={handleConfirmClear} color="error" variant="gradient">
                  Confirmar Exclusão
              </MDButton>
          </DialogActions>
      </Dialog>

      {/* Snackbar Local */}
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

// Adiciona PropTypes
SystemProfilesModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  dataSource: PropTypes.object,
  onDataClear: PropTypes.func, 
};

SystemProfilesModal.defaultProps = {
  dataSource: null,
  onDataClear: () => {},
};

export default SystemProfilesModal;