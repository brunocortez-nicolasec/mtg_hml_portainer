// material-react-app/src/layouts/observabilidade/sistemas/components/RHDataSourceModal.js

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios"; 

// @mui material components
import Modal from "@mui/material/Modal";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import Collapse from "@mui/material/Collapse";
import Tooltip from "@mui/material/Tooltip";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDAlert from "components/MDAlert";

const tipoFonteOptions = ["CSV", "DATABASE", "API"]; 

// Opções de banco de dados (padronizado para o que o backend espera)
const databaseTypeOptions = ["postgres", "mysql", "oracle", "sqlserver"]; 

function RHDataSourceModal({ open, onClose, onSave, initialData }) {
  
  // Estado inicial alinhado com o schema.prisma (db_host, db_user, etc.)
  const defaultState = {
    name: "",
    origem: "RH", 
    description: "",
    type_datasource: "CSV", // CSV, DATABASE, API
    
    // Campos CSV
    diretorio_hr: "", 
    
    // Campos Banco de Dados
    db_host: "",
    db_port: "5432", // Default Postgres
    db_name: "",
    db_user: "",
    db_password: "",
    db_type: "postgres", // Default
    
    // Campos API 
    api_url: "",
    api_user: "", 
    api_token: "", 
  };

  const [formData, setFormData] = useState(defaultState);
  const [testStatus, setTestStatus] = useState({ show: false, color: "info", message: "" });
  const [isTesting, setIsTesting] = useState(false);
  
  // API
  const api = axios.create({
    baseURL: "/",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  
  // Carrega dados iniciais ao abrir o modal
  useEffect(() => {
    if (open) {
      setTestStatus({ show: false });
      if (initialData) {
        const config = initialData.hrConfig || {};

        setFormData({
            ...defaultState,
            name: initialData.name_datasource || "",
            description: initialData.description_datasource || "",
            type_datasource: initialData.type_datasource || "CSV",
            
            // CSV
            diretorio_hr: config.diretorio_hr || "",
            
            // DB (Mapeando corretamente para os campos do banco)
            db_host: config.db_host || "",
            db_port: config.db_port || "5432",
            db_name: config.db_name || "",
            db_user: config.db_user || "",
            db_password: config.db_password || "", 
            db_type: config.db_type || "postgres",
        });
        
      } else {
        setFormData(defaultState);
      }
    }
  }, [initialData, open]);

  // Reseta status de teste ao mudar de tipo
  useEffect(() => {
    setTestStatus({ show: false });
    setIsTesting(false);
  }, [formData.type_datasource]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleAutocompleteChange = (name, newValue) => {
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  // --- Funções de Teste ---
  
  const handleTestCSV = async () => {
    if (!formData.diretorio_hr) {
      setTestStatus({ show: true, color: "warning", message: "Por favor, insira o diretório CSV para testar." });
      return;
    }
    setIsTesting(true);
    setTestStatus({ show: true, color: "info", message: "Testando leitura do arquivo CSV..." });

    try {
      const response = await api.post("/datasources/test-csv", { diretorio: formData.diretorio_hr });
      setTestStatus({ 
        show: true, 
        color: "success", 
        message: `Sucesso! Arquivo encontrado. Cabeçalho: ${response.data.header.substring(0, 50)}...` 
      });
    } catch (error) {
      const message = error.response?.data?.message || "Erro desconhecido.";
      setTestStatus({ show: true, color: "error", message: `Falha na conexão CSV: ${message}` });
    } finally {
      setIsTesting(false);
    }
  };
  
  const handleTestDatabase = async () => {
    if (!formData.db_host || !formData.db_port || !formData.db_user || !formData.db_name) {
       setTestStatus({ show: true, color: "warning", message: "Preencha Host, Porta, Banco e Usuário para testar." });
       return;
    }
    
    setIsTesting(true);
    setTestStatus({ show: true, color: "info", message: "Conectando ao Banco de Dados..." });
    
    try {
        // CORREÇÃO AQUI: Enviando 'user' em vez de 'username'
        const response = await api.post("/datasources/test-db", { 
            host: formData.db_host,
            port: formData.db_port,
            user: formData.db_user, // <-- O Backend espera 'user'
            password: formData.db_password,
            database: formData.db_name,
            type: formData.db_type
        });
        
        setTestStatus({ 
            show: true, 
            color: "success", 
            message: `Sucesso! Conexão estabelecida. Hora do servidor: ${response.data.serverTime || 'OK'}` 
        });
    } catch (error) {
        const message = error.response?.data?.message || "Erro desconhecido.";
        setTestStatus({ show: true, color: "error", message: `Falha na conexão DB: ${message}` });
    } finally {
        setIsTesting(false);
    }
  };
  
  const handleTestConnection = () => {
      if (formData.type_datasource === "CSV") return handleTestCSV();
      if (formData.type_datasource === "DATABASE") return handleTestDatabase();
      // API logic here if needed
  }

  const getSaveDisabled = () => {
    if (!formData.name) return true;
    if (isTesting) return true;
    
    // Exige teste com sucesso antes de salvar
    if (formData.type_datasource !== null) {
      return testStatus.color !== "success";
    }
    return false;
  };
  
  const handleSave = () => {
    // Prepara o payload para salvar (SystemConfig / HRConfig)
    const payload = {
        name: formData.name,
        origem: "RH",
        description: formData.description,
        databaseType: formData.type_datasource, 
        
        // Campos específicos
        diretorio: formData.diretorio_hr, 
        
        // Novos campos DB
        db_host: formData.db_host,
        db_port: formData.db_port,
        db_name: formData.db_name,
        db_user: formData.db_user,
        db_password: formData.db_password,
        db_type: formData.db_type,
    };

    onSave(payload); 
  };
  
  const renderConnectionFields = () => {
    switch (formData.type_datasource) {
        case "CSV":
            return (
                <Grid item xs={12}>
                    <MDInput
                        label="Diretório (Caminho no Servidor)"
                        name="diretorio_hr"
                        value={formData.diretorio_hr}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="/app/files/rh_data.csv"
                    />
                </Grid>
            );
        case "DATABASE":
            return (
                <>
                    <Grid item xs={12}>
                      <Autocomplete
                        options={databaseTypeOptions}
                        value={formData.db_type || null}
                        onChange={(e, nv) => handleAutocompleteChange("db_type", nv)}
                        renderInput={(params) => <MDInput {...params} label="Tipo de Banco" />}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <MDInput label="Host" name="db_host" value={formData.db_host} onChange={handleInputChange} fullWidth placeholder="localhost" />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <MDInput label="Porta" name="db_port" value={formData.db_port} onChange={handleInputChange} fullWidth placeholder="5432" />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MDInput label="Nome do Banco" name="db_name" value={formData.db_name} onChange={handleInputChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MDInput label="Usuário" name="db_user" value={formData.db_user} onChange={handleInputChange} fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                        <MDInput label="Senha" name="db_password" value={formData.db_password} type="password" onChange={handleInputChange} fullWidth />
                    </Grid>
                </>
            );
        default:
            return null;
    }
  };

  return (
    <Modal open={open} onClose={onClose} sx={{ display: "grid", placeItems: "center" }}>
      <Card sx={{ width: "90%", maxWidth: "600px", overflowY: "auto", maxHeight: "90vh" }}>
        <MDBox p={3}>
          <MDTypography variant="h5">{initialData ? "Editar" : "Adicionar"} Fonte de Dados RH</MDTypography>
          <MDTypography variant="caption" color="text">Origem: RH (Fonte Autoritativa)</MDTypography>
        </MDBox>
        <MDBox component="form" p={3} pt={0}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <MDInput label="Nome" name="name" value={formData.name} onChange={handleInputChange} fullWidth autoFocus />
                </Grid>
                
                <Grid item xs={12}>
                    <Autocomplete
                        options={tipoFonteOptions}
                        value={formData.type_datasource || null}
                        onChange={(e, nv) => handleAutocompleteChange("type_datasource", nv)}
                        renderInput={(params) => <MDInput {...params} label="Tipo de Conexão" />}
                        fullWidth
                    />
                </Grid>
                
                {renderConnectionFields()}
                
                <Grid item xs={12}>
                    <MDInput label="Descrição (Opcional)" name="description" value={formData.description} onChange={handleInputChange} fullWidth multiline rows={3} />
                </Grid>
            </Grid>
            
            <Collapse in={testStatus.show}>
                <MDAlert color={testStatus.color} sx={{ mt: 2, mb: 0 }}>
                    <MDTypography variant="caption" color="white">{testStatus.message}</MDTypography>
                </MDAlert>
            </Collapse>
            
            <MDBox mt={4} display="flex" justifyContent="flex-end">
                <MDButton variant="gradient" color="secondary" onClick={onClose} sx={{ mr: 2 }}>Cancelar</MDButton>
                
                {formData.type_datasource && (
                    <Tooltip title="Testar a conexão com a fonte de dados">
                        <MDButton variant="gradient" color="success" onClick={handleTestConnection} disabled={isTesting} sx={{ mr: 2 }}>
                            {isTesting ? "Testando..." : "Testar Conexão"}
                        </MDButton>
                    </Tooltip>
                )}
                
                <MDButton variant="gradient" color="info" onClick={handleSave} disabled={getSaveDisabled()}>
                    Salvar
                </MDButton>
            </MDBox>
        </MDBox>
      </Card>
    </Modal>
  );
}

RHDataSourceModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialData: PropTypes.object,
};

RHDataSourceModal.defaultProps = {
  initialData: null,
};

export default RHDataSourceModal;