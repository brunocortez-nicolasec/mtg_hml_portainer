// material-react-app/src/layouts/observabilidade/sistemas/components/SistemaDataSourceModal.js

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
import Radio from "@mui/material/Radio";
import RadioGroup from "@mui/material/RadioGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormControl from "@mui/material/FormControl";
import FormLabel from "@mui/material/FormLabel";
import Divider from "@mui/material/Divider";
import CircularProgress from "@mui/material/CircularProgress"; // Adicionado para feedback visual no botão salvar

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDAlert from "components/MDAlert";

const tipoFonteSistemaOptions = ["CSV", "DATABASE", "API"];
const databaseTypeOptions = ["postgres", "mysql", "oracle", "sqlserver"]; 

function SistemaDataSourceModal({ open, onClose, onSave, initialData }) {
  
  const [step, setStep] = useState(1); 
  const [isCreatingSystem, setIsCreatingSystem] = useState(false); // Agora usado no handleSave
  
  const defaultState = {
    name: "",
    origem: "SISTEMA",
    description: "",
    
    // Campos Sistema
    systemId: null, 
    
    // Config Contas
    tipo_fonte_contas: "CSV",
    diretorio_contas: "",
    
    // Config Recursos
    tipo_fonte_recursos: "CSV",
    diretorio_recursos: "",

    // Campos Banco de Dados (Compartilhado)
    db_type: "postgres",
    db_connection_type: "HOST", 
    
    // DB: Método Host
    db_host: "",
    db_port: "5432",
    db_name: "",
    db_user: "",
    db_password: "",
    
    // DB: Método URL
    db_url: "",

    // DB: Schema Padrão
    db_schema: "public",

    testStatusContas: { show: false, color: "info", message: "" },
    isTestingContas: false,
    testStatusRecursos: { show: false, color: "info", message: "" },
    isTestingRecursos: false,
    
    saveError: null, // Novo estado para erro no salvamento
  };

  const [formData, setFormData] = useState(defaultState);
  
  // URL Base Correta
  const API_URL = process.env.REACT_APP_API_URL;

  const api = axios.create({
    baseURL: API_URL, 
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  
  useEffect(() => {
    if (open) {
      if (initialData) {
        setStep(2); 
        const config = initialData.systemConfig || {};
        
        setFormData({
            ...defaultState,
            name: initialData.name_datasource || "",
            description: initialData.description_datasource || "",
            systemId: config.systemId || null,
            
            tipo_fonte_contas: config.tipo_fonte_contas || "CSV",
            diretorio_contas: config.diretorio_contas || "",
            
            tipo_fonte_recursos: config.tipo_fonte_recursos || "CSV",
            diretorio_recursos: config.diretorio_recursos || "",

            // DB Configs
            db_type: config.db_type || "postgres",
            db_connection_type: config.db_connection_type || "HOST",
            db_host: config.db_host || "",
            db_port: config.db_port || "5432",
            db_name: config.db_name || "",
            db_user: config.db_user || "",
            db_password: config.db_password || "",
            db_url: config.db_url || "",
            db_schema: config.db_schema || "public",
            
            testStatusContas: { show: false, color: "success" }, 
            testStatusRecursos: { show: false, color: "success" }, 
        });
        
      } else {
        setStep(1); 
        setFormData(defaultState);
      }
    }
  }, [initialData, open]);

  // Resets de Status (Mantidos)
  useEffect(() => {
    setFormData(prev => ({
       ...prev,
       testStatusContas: { show: false, color: "info", message: "" }, 
       testStatusRecursos: { show: false, color: "info", message: "" }
    }));
  }, [
    formData.db_connection_type, formData.db_host, formData.db_port, 
    formData.db_name, formData.db_user, formData.db_password, 
    formData.db_url, formData.db_schema, formData.db_type
  ]);

  useEffect(() => {
     setFormData(prev => ({ ...prev, testStatusContas: { show: false, color: "info", message: "" } }));
  }, [formData.tipo_fonte_contas, formData.diretorio_contas]);

  useEffect(() => {
     setFormData(prev => ({ ...prev, testStatusRecursos: { show: false, color: "info", message: "" } }));
  }, [formData.tipo_fonte_recursos, formData.diretorio_recursos]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleAutocompleteChange = (name, newValue) => {
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };
  
  // --- LÓGICA CORRIGIDA DO NEXT STEP ---
  const handleNextStep = () => {
    // Apenas validação visual e transição de tela. Nenhuma chamada de API.
    if (!formData.name) return;
    setStep(2);
  };

  // --- Lógica de Teste (Mantida e Blindada com API_URL) ---
  const handleTestCSV = async (diretorio, setTesting, setStatusState) => {
    if (!diretorio) {
        setFormData(prev => ({ ...prev, [setStatusState]: { show: true, color: "warning", message: "Insira o diretório para testar." } }));
        return;
    }
    setFormData(prev => ({ ...prev, [setTesting]: true, [setStatusState]: { show: true, color: "info", message: "Testando conexão com o arquivo..." } }));
    try {
      await api.post("/datasources/test-csv", { diretorio });
      setFormData(prev => ({ 
        ...prev, 
        [setStatusState]: { show: true, color: "success", message: "Sucesso! Arquivo encontrado." } 
      }));
    } catch (error) {
      const message = error.response?.data?.message || "Erro desconhecido.";
      setFormData(prev => ({ ...prev, [setStatusState]: { show: true, color: "error", message: `Falha: ${message}` } }));
    } finally {
      setFormData(prev => ({ ...prev, [setTesting]: false }));
    }
  };

  const handleTestDB = async (tableName, setTesting, setStatusState) => {
    if (!tableName) {
        setFormData(prev => ({ ...prev, [setStatusState]: { show: true, color: "warning", message: "Informe o nome da Tabela para validar." } }));
        return;
    }

    if (formData.db_connection_type === "HOST") {
        if (!formData.db_host || !formData.db_port || !formData.db_user || !formData.db_name) {
            setFormData(prev => ({ ...prev, [setStatusState]: { show: true, color: "warning", message: "Preencha os dados de conexão do Banco (Host, User, etc)." } }));
            return;
        }
    } else {
        if (!formData.db_url) {
            setFormData(prev => ({ ...prev, [setStatusState]: { show: true, color: "warning", message: "Preencha a URL de conexão." } }));
            return;
        }
    }

    setFormData(prev => ({ ...prev, [setTesting]: true, [setStatusState]: { show: true, color: "info", message: `Conectando e verificando tabela '${tableName}'...` } }));

    try {
        const response = await api.post("/datasources/test-db", { 
            connectionType: formData.db_connection_type,
            host: formData.db_host,
            port: formData.db_port,
            user: formData.db_user,
            password: formData.db_password,
            database: formData.db_name,
            url: formData.db_url,
            type: formData.db_type,
            schema: formData.db_schema,
            table: tableName 
        });
        
        let successMsg = response.data.message;
        if (response.data.columns && response.data.columns.length > 0) {
             const colList = response.data.columns.slice(0, 3).join(", "); 
             const extra = response.data.columns.length > 3 ? `... (+${response.data.columns.length - 3})` : "";
             successMsg = `OK! Tabela '${tableName}' encontrada. Cols: [${colList}${extra}]`;
        }

        setFormData(prev => ({ 
            ...prev, 
            [setStatusState]: { show: true, color: "success", message: successMsg } 
        }));
    } catch (error) {
        const message = error.response?.data?.message || "Erro desconhecido.";
        setFormData(prev => ({ ...prev, [setStatusState]: { show: true, color: "error", message: `Falha: ${message}` } }));
    } finally {
        setFormData(prev => ({ ...prev, [setTesting]: false }));
    }
  };
  
  const handleTestContas = () => {
    if (formData.tipo_fonte_contas === "CSV") {
      handleTestCSV(formData.diretorio_contas, 'isTestingContas', 'testStatusContas');
    } else if (formData.tipo_fonte_contas === "DATABASE") {
      handleTestDB(formData.diretorio_contas, 'isTestingContas', 'testStatusContas');
    }
  };

  const handleTestRecursos = () => {
    if (formData.tipo_fonte_recursos === "CSV") {
      handleTestCSV(formData.diretorio_recursos, 'isTestingRecursos', 'testStatusRecursos');
    } else if (formData.tipo_fonte_recursos === "DATABASE") {
      handleTestDB(formData.diretorio_recursos, 'isTestingRecursos', 'testStatusRecursos');
    }
  };

  const getSaveDisabled = () => {
      if (isCreatingSystem) return true; // Bloqueia enquanto salva
      if (formData.isTestingContas || formData.isTestingRecursos) return true;
      
      if (formData.tipo_fonte_contas !== 'API') {
          if (formData.testStatusContas.color !== 'success') return true;
      }

      if (formData.tipo_fonte_recursos !== 'API') {
           if (formData.testStatusRecursos.color !== 'success') return true;
      }

      return false;
  };
  
  // --- LÓGICA CORRIGIDA DO SAVE ---
  const handleSave = async () => {
    setFormData(prev => ({ ...prev, saveError: null }));
    setIsCreatingSystem(true);

    try {
        let finalSystemId = formData.systemId;

        // SE não tem ID e não é edição (initialData), precisamos criar o sistema no Catálogo PRIMEIRO
        if (!finalSystemId && !initialData) {
            const response = await api.post("/systems-catalog", {
                name_system: formData.name,
                description_system: formData.description
            });
            finalSystemId = response.data.id;
        }

        // Agora montamos o payload com o ID garantido
        const payload = {
            name: formData.name,
            origem: "SISTEMA",
            description: formData.description,
            systemId: finalSystemId, // ID vital
            
            tipo_fonte_contas: formData.tipo_fonte_contas,
            diretorio_contas: formData.diretorio_contas,
            
            tipo_fonte_recursos: formData.tipo_fonte_recursos,
            diretorio_recursos: formData.diretorio_recursos,

            // DB Shared Config
            db_connection_type: formData.db_connection_type,
            db_host: formData.db_host,
            db_port: formData.db_port,
            db_name: formData.db_name,
            db_user: formData.db_user,
            db_password: formData.db_password,
            db_type: formData.db_type,
            db_url: formData.db_url,
            db_schema: formData.db_schema,
        };

        // Chama a função do pai para salvar a Configuração da Fonte de Dados
        await onSave(payload); 
        
        // O fechamento do modal é controlado pelo pai após sucesso do onSave

    } catch (error) {
        console.error("Erro no fluxo de salvamento:", error);
        const message = error.response?.data?.message || "Erro ao criar sistema ou salvar configurações.";
        setFormData(prev => ({ ...prev, saveError: message }));
    } finally {
        setIsCreatingSystem(false);
    }
  };
  
  // --- RENDERIZAÇÃO ---
  const renderDbFields = () => (
    <>
        <Grid item xs={12}>
            <Divider sx={{my: 1}}><MDTypography variant="caption">Conexão de Banco de Dados (Compartilhada)</MDTypography></Divider>
            <MDTypography variant="caption" color="text" display="block" mb={2}>
               A conexão abaixo será usada para buscar tanto a tabela de Contas quanto a de Recursos.
            </MDTypography>
        </Grid>
        
         <Grid item xs={12}>
            <Autocomplete
            options={databaseTypeOptions}
            value={formData.db_type || null}
            onChange={(e, nv) => handleAutocompleteChange("db_type", nv)}
            renderInput={(params) => <MDInput {...params} label="Tipo de Banco" />}
            fullWidth
            />
        </Grid>

        <Grid item xs={12}>
            <FormControl component="fieldset">
                <FormLabel component="legend" sx={{ fontSize: '0.875rem', mb: 1 }}>Método de Conexão</FormLabel>
                <RadioGroup
                row
                name="db_connection_type"
                value={formData.db_connection_type}
                onChange={handleInputChange}
                >
                <FormControlLabel value="HOST" control={<Radio />} label={<MDTypography variant="body2">Host / Porta</MDTypography>} />
                <FormControlLabel value="URL" control={<Radio />} label={<MDTypography variant="body2">URL de Conexão</MDTypography>} />
                </RadioGroup>
            </FormControl>
        </Grid>

        {formData.db_connection_type === 'HOST' ? (
            <>
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
        ) : (
            <Grid item xs={12}>
                <MDInput 
                    label="URL de Conexão" 
                    name="db_url" 
                    value={formData.db_url} 
                    onChange={handleInputChange} 
                    fullWidth 
                    placeholder="postgresql://user:pass@host:port/db"
                />
            </Grid>
        )}
        
        <Grid item xs={12}>
             <MDInput label="Schema Padrão" name="db_schema" value={formData.db_schema} onChange={handleInputChange} fullWidth placeholder="public" helperText="Esquema onde as tabelas estão localizadas" />
        </Grid>
    </>
  );

  const renderStep = () => {
    if (step === 1) {
      return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <MDInput label="Nome do Sistema" name="name" value={formData.name} onChange={handleInputChange} fullWidth autoFocus />
                </Grid>
                <Grid item xs={12}>
                    <MDInput label="Descrição (Opcional)" name="description" value={formData.description} onChange={handleInputChange} fullWidth multiline rows={3} />
                </Grid>
            </Grid>
            
            {/* Exibe erro caso tenha falhado ao tentar criar no passo anterior (embora agora não criamos mais) */}
            <Collapse in={!!formData.saveError}>
                <MDAlert color="error" sx={{ mt: 2, mb: 0 }}>
                    <MDTypography variant="caption" color="white">{formData.saveError}</MDTypography>
                </MDAlert>
            </Collapse>

            <MDBox mt={4} display="flex" justifyContent="flex-end">
                <MDButton variant="gradient" color="secondary" onClick={onClose} sx={{ mr: 2 }}>Cancelar</MDButton>
                <MDButton variant="gradient" color="info" onClick={handleNextStep} disabled={!formData.name}>
                    Próximo
                </MDButton>
            </MDBox>
        </>
      );
    }
    
    if (step === 2) {
      const showDbFields = formData.tipo_fonte_contas === 'DATABASE' || formData.tipo_fonte_recursos === 'DATABASE';
      return (
        <>
            <Grid container spacing={3}>
                {/* --- Config Contas --- */}
                <Grid item xs={12}>
                    <MDTypography variant="h6" fontWeight="medium" mb={1}>Fonte de Contas</MDTypography>
                    <Autocomplete
                        options={tipoFonteSistemaOptions}
                        value={formData.tipo_fonte_contas || null}
                        onChange={(e, nv) => handleAutocompleteChange("tipo_fonte_contas", nv)}
                        renderInput={(params) => <MDInput {...params} label="Tipo" />}
                        fullWidth
                    />
                    {formData.tipo_fonte_contas === "CSV" && (
                        <MDInput label="Diretório de Contas" name="diretorio_contas" value={formData.diretorio_contas} onChange={handleInputChange} fullWidth sx={{ mt: 2 }} placeholder="/app/files/system_accounts.csv" />
                    )}
                     {formData.tipo_fonte_contas === "DATABASE" && (
                        <MDInput label="Tabela de Contas" name="diretorio_contas" value={formData.diretorio_contas} onChange={handleInputChange} fullWidth sx={{ mt: 2 }} placeholder="Ex: tb_servicenow_contas" />
                    )}
                </Grid>
                
                {/* --- Config Recursos --- */}
                <Grid item xs={12} sx={{ mt: 2 }}>
                    <MDTypography variant="h6" fontWeight="medium" mb={1}>Fonte de Recursos</MDTypography>
                    <Autocomplete
                        options={tipoFonteSistemaOptions}
                        value={formData.tipo_fonte_recursos || null}
                        onChange={(e, nv) => handleAutocompleteChange("tipo_fonte_recursos", nv)}
                        renderInput={(params) => <MDInput {...params} label="Tipo" />}
                        fullWidth
                    />
                    {formData.tipo_fonte_recursos === "CSV" && (
                        <MDInput label="Diretório de Recursos" name="diretorio_recursos" value={formData.diretorio_recursos} onChange={handleInputChange} fullWidth sx={{ mt: 2 }} placeholder="/app/files/system_resources.csv" />
                    )}
                    {formData.tipo_fonte_recursos === "DATABASE" && (
                        <MDInput label="Tabela de Recursos" name="diretorio_recursos" value={formData.diretorio_recursos} onChange={handleInputChange} fullWidth sx={{ mt: 2 }} placeholder="Ex: tb_servicenow_recursos" />
                    )}
                </Grid>

                {showDbFields && renderDbFields()}
            </Grid>
            
            {/* Alertas de Teste */}
            <Collapse in={formData.testStatusContas.show}>
                <MDAlert color={formData.testStatusContas.color} sx={{ mt: 2, mb: 0 }}>
                    <MDTypography variant="caption" color="white">[CONTAS] {formData.testStatusContas.message}</MDTypography>
                </MDAlert>
            </Collapse>
            <Collapse in={formData.testStatusRecursos.show}>
                <MDAlert color={formData.testStatusRecursos.color} sx={{ mt: 1, mb: 0 }}>
                    <MDTypography variant="caption" color="white">[RECURSOS] {formData.testStatusRecursos.message}</MDTypography>
                </MDAlert>
            </Collapse>

            {/* Erro geral de salvamento */}
            <Collapse in={!!formData.saveError}>
                <MDAlert color="error" sx={{ mt: 2, mb: 0 }}>
                    <MDTypography variant="caption" color="white">Erro ao Salvar: {formData.saveError}</MDTypography>
                </MDAlert>
            </Collapse>
            
            <MDBox mt={4} display="flex" justifyContent="space-between" alignItems="center">
                {!initialData && (
                    <MDButton variant="gradient" color="secondary" onClick={() => setStep(1)} disabled={isCreatingSystem}>Voltar</MDButton>
                )}
                <MDBox ml="auto" display="flex" alignItems="center">
                    {/* Botões de Teste */}
                    {formData.tipo_fonte_contas !== 'API' && (
                        <Tooltip title={`Testar ${formData.tipo_fonte_contas === 'DATABASE' ? 'Conexão DB e Tabela' : 'Arquivo CSV'}`}>
                            <MDButton variant="gradient" color="success" onClick={handleTestContas} disabled={formData.isTestingContas || isCreatingSystem} sx={{ mr: 1 }}>
                                {formData.isTestingContas ? "..." : "Testar Contas"}
                            </MDButton>
                        </Tooltip>
                    )}
                    
                    {formData.tipo_fonte_recursos !== 'API' && (
                        <Tooltip title={`Testar ${formData.tipo_fonte_recursos === 'DATABASE' ? 'Conexão DB e Tabela' : 'Arquivo CSV'}`}>
                            <MDButton variant="gradient" color="success" onClick={handleTestRecursos} disabled={formData.isTestingRecursos || isCreatingSystem} sx={{ mr: 2 }}>
                                {formData.isTestingRecursos ? "..." : "Testar Recursos"}
                            </MDButton>
                        </Tooltip>
                    )}

                    <MDButton variant="gradient" color="info" onClick={handleSave} disabled={getSaveDisabled()}>
                        {isCreatingSystem ? <CircularProgress size={20} color="inherit" /> : "Salvar"}
                    </MDButton>
                </MDBox>
            </MDBox>
        </>
      );
    }
  };
      
  return (
    <Modal open={open} onClose={onClose} sx={{ display: "grid", placeItems: "center" }}>
      <Card sx={{ width: "90%", maxWidth: "600px", overflowY: "auto", maxHeight: "90vh" }}>
        <MDBox p={3}>
          <MDTypography variant="h5">{initialData ? "Editar" : "Adicionar"} Fonte de Dados de Sistema</MDTypography>
          <MDTypography variant="caption" color="text">Origem: SISTEMA (Passo {step} de 2)</MDTypography>
        </MDBox>
        <MDBox component="form" p={3} pt={0}>
          {renderStep()}
        </MDBox>
      </Card>
    </Modal>
  );
}

SistemaDataSourceModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialData: PropTypes.object,
};

SistemaDataSourceModal.defaultProps = {
  initialData: null,
};

export default SistemaDataSourceModal;