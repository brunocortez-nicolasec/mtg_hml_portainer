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

const tipoFonteOptions = ["CSV", "Banco de Dados", "API"];

// Opções de banco de dados para sugestão no input (se necessário)
const databaseTypeOptions = ["PostgreSQL", "Oracle", "Microsoft SQL Server", "MySQL", "Other"]; 


function RHDataSourceModal({ open, onClose, onSave, initialData }) {
  
  // Estado inicial específico para RH (origem fixa)
  const defaultState = {
    name: "",
    origem: "RH", 
    description: "",
    databaseType: "CSV", // Novo campo para o tipo de fonte
    
    // Campos CSV
    diretorio: "", 
    
    // Campos Banco de Dados
    dbHost: "",
    dbPort: "",
    dbName: "",
    dbUsername: "",
    dbPassword: "",
    dbSoftware: "", // MySQL, Oracle, etc.
    
    // Campos API
    apiUrl: "",
    apiAuthType: "Basic", // Ex: Basic, Bearer, None
    apiToken: "",
    apiUsername: "",
    apiPassword: "",
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
        // Mapeamento de Edição
        const initialMap = {
            ...defaultState,
            name: initialData.name_datasource || "",
            description: initialData.description_datasource || "",
            databaseType: initialData.type_datasource || "CSV",
        };
        
        // Mapeia dados da sub-config RH (hrConfig) se existirem
        if (initialData.hrConfig) {
            // Assume que 'diretorio' está em hrConfig para CSV
            initialMap.diretorio = initialData.hrConfig.diretorio_hr || "";
            // Adicione aqui o mapeamento para DB/API se existirem na initialData.hrConfig
        }
        
        setFormData(initialMap);
      } else {
        setFormData(defaultState);
      }
    }
  }, [initialData, open]);

  // Reseta status de teste ao mudar de tipo ou campos
  useEffect(() => {
    setTestStatus({ show: false });
    setIsTesting(false);
  }, [formData.databaseType, formData.diretorio, formData.dbHost, formData.apiUrl]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };
  
  const handleAutocompleteChange = (name, newValue) => {
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };

  // Funções de Teste (CSV, DB, API)
  
  const handleTestCSV = async () => {
    if (!formData.diretorio) {
      setTestStatus({ show: true, color: "warning", message: "Por favor, insira o diretório CSV para testar." });
      return;
    }
    
    setIsTesting(true);
    setTestStatus({ show: true, color: "info", message: "Testando conexão com o arquivo CSV..." });

    try {
      // Endpoint para teste de CSV (mantido do original)
      const response = await api.post("/datasources/test-csv", { diretorio: formData.diretorio });
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
    // Validação básica para DB
    if (!formData.dbHost || !formData.dbPort || !formData.dbUsername) {
       setTestStatus({ show: true, color: "warning", message: "Preencha Host, Porta e Usuário do DB para testar." });
       return;
    }
    
    setIsTesting(true);
    setTestStatus({ show: true, color: "info", message: "Testando conexão com o Banco de Dados..." });
    
    try {
        // Endpoint para teste de Banco de Dados (ex: /datasources/test-db)
        const response = await api.post("/datasources/test-db", { 
            host: formData.dbHost,
            port: formData.dbPort,
            username: formData.dbUsername,
            password: formData.dbPassword,
            software: formData.dbSoftware,
            database: formData.dbName,
        });
        
        setTestStatus({ 
            show: true, 
            color: "success", 
            message: `Sucesso! Conexão com ${formData.dbSoftware} estabelecida.` 
        });
    } catch (error) {
        const message = error.response?.data?.message || "Erro desconhecido.";
        setTestStatus({ show: true, color: "error", message: `Falha na conexão DB: ${message}` });
    } finally {
        setIsTesting(false);
    }
  };
  
  const handleTestAPI = async () => {
    if (!formData.apiUrl) {
       setTestStatus({ show: true, color: "warning", message: "Preencha a URL da API para testar." });
       return;
    }
    
    setIsTesting(true);
    setTestStatus({ show: true, color: "info", message: "Testando conexão com a API..." });
    
    try {
        // Endpoint para teste de API (ex: /datasources/test-api)
        const response = await api.post("/datasources/test-api", { 
            url: formData.apiUrl,
            authType: formData.apiAuthType,
            token: formData.apiToken,
        });
        
        setTestStatus({ 
            show: true, 
            color: "success", 
            message: `Sucesso! API retornou status ${response.status}.` 
        });
    } catch (error) {
        const message = error.response?.data?.message || "Erro desconhecido.";
        setTestStatus({ show: true, color: "error", message: `Falha na conexão API: ${message}` });
    } finally {
        setIsTesting(false);
    }
  };

  const handleTestConnection = () => {
      if (formData.databaseType === "CSV") return handleTestCSV();
      if (formData.databaseType === "Banco de Dados") return handleTestDatabase();
      if (formData.databaseType === "API") return handleTestAPI();
  }

  // Lógica de Validação: Precisa de nome e um teste bem-sucedido
  const getSaveDisabled = () => {
    if (!formData.name) return true;
    
    // Se estiver testando, desabilita
    if (isTesting) return true;
    
    // Se o tipo for CSV, DB ou API, requer o teste de sucesso
    if (formData.databaseType !== null) {
      return testStatus.color !== "success";
    }
    
    return false;
  };
  
  const handleSave = () => {
    // Passa os dados para a função de salvamento do componente pai
    onSave(formData); 
  };
  
  const renderConnectionFields = () => {
    switch (formData.databaseType) {
        case "CSV":
            return (
                <Grid item xs={12}>
                    <MDInput
                        label="Diretório (Caminho no Servidor)"
                        name="diretorio"
                        value={formData.diretorio}
                        onChange={handleInputChange}
                        fullWidth
                        placeholder="/app/files/rh_data.csv"
                    />
                </Grid>
            );
        case "Banco de Dados":
            return (
                <>
                    <Grid item xs={12}>
                      <Autocomplete
                        options={databaseTypeOptions}
                        value={formData.dbSoftware || null}
                        onChange={(e, nv) => handleAutocompleteChange("dbSoftware", nv)}
                        renderInput={(params) => <MDInput {...params} label="Software de DB" />}
                        fullWidth
                      />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MDInput label="Host" name="dbHost" value={formData.dbHost} onChange={handleInputChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MDInput label="Porta" name="dbPort" value={formData.dbPort} onChange={handleInputChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MDInput label="Nome do Banco/Serviço" name="dbName" value={formData.dbName} onChange={handleInputChange} fullWidth />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <MDInput label="Usuário" name="dbUsername" value={formData.dbUsername} onChange={handleInputChange} fullWidth />
                    </Grid>
                    <Grid item xs={12}>
                        <MDInput label="Senha" name="dbPassword" value={formData.dbPassword} type="password" onChange={handleInputChange} fullWidth />
                    </Grid>
                </>
            );
        case "API":
            return (
                <>
                    <Grid item xs={12}>
                        <MDInput label="URL da API" name="apiUrl" value={formData.apiUrl} onChange={handleInputChange} fullWidth placeholder="https://api.rh.com/users" />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Autocomplete
                            options={["Bearer", "Basic", "None"]}
                            value={formData.apiAuthType || null}
                            onChange={(e, nv) => handleAutocompleteChange("apiAuthType", nv)}
                            renderInput={(params) => <MDInput {...params} label="Tipo de Autenticação" />}
                            fullWidth
                        />
                    </Grid>
                    {formData.apiAuthType === "Bearer" && (
                        <Grid item xs={12} md={6}>
                            <MDInput label="Token Bearer" name="apiToken" value={formData.apiToken} onChange={handleInputChange} fullWidth />
                        </Grid>
                    )}
                    {formData.apiAuthType === "Basic" && (
                        <>
                            <Grid item xs={12} md={6}>
                                <MDInput label="Usuário da API" name="apiUsername" value={formData.apiUsername} onChange={handleInputChange} fullWidth />
                            </Grid>
                            <Grid item xs={12} md={6}>
                                <MDInput label="Senha da API" name="apiPassword" value={formData.apiPassword} type="password" onChange={handleInputChange} fullWidth />
                            </Grid>
                        </>
                    )}
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
          <MDTypography variant="caption" color="text">Origem: RH</MDTypography>
        </MDBox>
        <MDBox component="form" p={3} pt={0}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <MDInput label="Nome" name="name" value={formData.name} onChange={handleInputChange} fullWidth autoFocus />
                </Grid>
                
                <Grid item xs={12}>
                    <Autocomplete
                        options={tipoFonteOptions}
                        value={formData.databaseType || null}
                        onChange={(e, nv) => handleAutocompleteChange("databaseType", nv)}
                        renderInput={(params) => <MDInput {...params} label="Tipo de Fonte" />}
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
                
                {formData.databaseType && (
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