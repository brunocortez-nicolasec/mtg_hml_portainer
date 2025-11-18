// material-react-app/src/layouts/observabilidade/sistemas/components/DataSourceModal.js

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { useTheme } from "@mui/material/styles";
import axios from "axios"; 

// @mui material components
import Modal from "@mui/material/Modal";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";
import Autocomplete from "@mui/material/Autocomplete";
import Checkbox from "@mui/material/Checkbox"; 
import FormControlLabel from "@mui/material/FormControlLabel"; 
import Collapse from "@mui/material/Collapse"; 
import Tooltip from "@mui/material/Tooltip"; 

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDAlert from "components/MDAlert"; 

function DataSourceModal({ open, onClose, onSave, initialData, darkMode }) {
  const theme = useTheme();

  // Passo 0 = Modo Padrão (RH, IDM)
  // Passo 1 = Modo Sistema (Info do Sistema)
  // Passo 2 = Modo Sistema (Config. Conexão)
  const [step, setStep] = useState(0); 
  
  const [isCreatingSystem, setIsCreatingSystem] = useState(false);

  const defaultState = {
    // Campos DataSource
    name: "",
    databaseType: "CSV", 
    description: "",
    origem: "",
    
    // Campos HRConfig
    diretorio: "", 
    
    // Campos SystemConfig (para Passo 2)
    systemId: null, // O ID do 'System' (Catálogo)
    tipo_fonte_contas: "CSV",
    diretorio_contas: "",
    tipo_fonte_recursos: "CSV",
    diretorio_recursos: "",
    
    // (Campos de DB - mantidos para o futuro)
    username: "",
    serverName: "",
    port: "",
    database: "",
    serviceName: "",
    isNative: false,
    isJdbcUrlEditable: false,
    jdbcUrl: "",
  };

  const [formData, setFormData] = useState(defaultState);
  
  // Estados de Teste (Padrão/RH)
  const [testStatus, setTestStatus] = useState({ show: false, color: "info", message: "" });
  const [isTesting, setIsTesting] = useState(false);
  
  // Estados de Teste (Sistema - Contas)
  const [testStatusContas, setTestStatusContas] = useState({ show: false, color: "info", message: "" });
  const [isTestingContas, setIsTestingContas] = useState(false);
  
  // Estados de Teste (Sistema - Recursos)
  const [testStatusRecursos, setTestStatusRecursos] = useState({ show: false, color: "info", message: "" });
  const [isTestingRecursos, setIsTestingRecursos] = useState(false);

  // API (usada em vários locais)
  const api = axios.create({
    baseURL: "/",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  
  // Opções dos Dropdowns
  const tipoFonteOptions = [ 
    "CSV",
    "PostgreSQL",
    "Oracle",
    "Microsoft SQL Server",
    "Other"
  ];
  
  const tipoFonteSistemaOptions = ["CSV", "DATABASE", "API"];

  const origemOptions = ["RH", "IDM", "SISTEMA"]; 

  const checkboxLabelStyles = {
    "& .MuiTypography-root": {
      color: darkMode ? theme.palette.white.main : theme.palette.text.primary,
      fontSize: "0.875rem",
    },
  };

  // Carrega os dados iniciais (Modo Edição)
  useEffect(() => {
    if (open) {
      // Limpa todos os estados ao abrir
      setFormData(defaultState);
      setStep(0);
      setTestStatus({ show: false });
      setTestStatusContas({ show: false });
      setTestStatusRecursos({ show: false });
      setIsTesting(false);
      setIsTestingContas(false);
      setIsTestingRecursos(false);
      setIsCreatingSystem(false); 

      if (initialData) {
        // MODO DE EDIÇÃO
        let flatData = {
          ...defaultState,
          name: initialData.name_datasource || "",
          origem: initialData.origem_datasource || "",
          databaseType: initialData.type_datasource || "CSV",
          description: initialData.description_datasource || "",
        };
        
        if (initialData.origem_datasource === "RH" && initialData.hrConfig) {
          flatData.diretorio = initialData.hrConfig.diretorio_hr || "";
          setStep(0); // Modo Padrão
        
        } else if (initialData.origem_datasource === "SISTEMA" && initialData.systemConfig) {
          const config = initialData.systemConfig;
          flatData.systemId = config.systemId || null;
          flatData.tipo_fonte_contas = config.tipo_fonte_contas || "CSV";
          flatData.diretorio_contas = config.diretorio_accounts || "";
          flatData.tipo_fonte_recursos = config.tipo_fonte_recursos || "CSV";
          flatData.diretorio_recursos = config.diretorio_resources || "";
          
          // Se estamos editando um SISTEMA, pulamos direto para o Passo 2
          setStep(2); 
        
        } else {
          setStep(0); // Modo Padrão (ex: IDM)
        }
        
        setFormData(flatData);

      } else {
        // MODO DE ADIÇÃO
        setFormData(defaultState);
        setStep(0); // Começa no modo padrão
      }
    }
  }, [initialData, open]);

  // Efeito para gerenciar os passos do wizard (APENAS EM MODO DE CRIAÇÃO)
  useEffect(() => {
    if (!initialData) { // Só roda se for um novo cadastro
      if (formData.origem === "SISTEMA") {
        setStep(1); // Vai para o Passo 1
      } else {
        setStep(0); // Volta ao Passo 0
      }
    }
  }, [formData.origem, initialData]);
  
  // (useEffect para portas default - mantido como estava)
  useEffect(() => {
    const defaults = {
      PostgreSQL: "5432",
      Oracle: "1521",
      "Microsoft SQL Server": "1433",
      Other: "",
      CSV: "",
    };
    if (!initialData && step === 0) { 
      if (Object.keys(defaults).includes(formData.databaseType)) {
        setFormData((prev) => ({ ...prev, port: defaults[prev.databaseType] }));
      }
    }
  }, [formData.databaseType, initialData, step]);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    
    // Limpa o status de teste específico
    if (name === "diretorio") setTestStatus({ show: false });
    if (name === "diretorio_contas") setTestStatusContas({ show: false });
    if (name === "diretorio_recursos") setTestStatusRecursos({ show: false });
    if (name === "name") setTestStatus({ show: false }); // Limpa erro do passo 1
  };
  
  const handleAutocompleteChange = (name, newValue) => {
    setTestStatus({ show: false });
    setTestStatusContas({ show: false });
    setTestStatusRecursos({ show: false });
    
    setFormData((prev) => {
      const newState = { ...prev, [name]: newValue };
      // Se o usuário mudar a origem para fora de "Sistema",
      // resetamos o systemId que possa ter sido criado
      if (name === "origem" && newValue !== "SISTEMA") {
        newState.systemId = null;
      }
      return newState;
    });
  };

  // Salva o formulário (agora envia o formData completo)
  const handleSave = () => {
    onSave(formData);
  };
  
  /**
   * Chamado pelo botão "Próximo" do Passo 1.
   * Cria o 'System' (catálogo) e avança para o Passo 2.
   */
  const handleNextStep = async () => {
    setIsCreatingSystem(true);
    setTestStatus({ show: false }); // Limpa erros antigos

    // FIX: Se o systemId JÁ EXISTE (usuário clicou 'Voltar'), 
    // apenas avança para o passo 2 sem criar de novo.
    if (formData.systemId !== null) {
      setStep(2);
      setIsCreatingSystem(false);
      return;
    }

    // Se systemId é nulo, tenta criar o sistema
    try {
      // Chama a nova API que criamos no backend
      const response = await api.post("/systems-catalog", {
        name_system: formData.name,
        description_system: formData.description
      });

      // Sucesso! Salva o ID do novo sistema e avança
      const newSystemId = response.data.id;
      setFormData(prev => ({ ...prev, systemId: newSystemId }));
      setStep(2); // Avança para o Passo 2

    } catch (error) {
      // O sistema já existe? Ou outro erro?
      const message = error.response?.data?.message || "Erro ao criar o sistema no catálogo.";
      // Mostra o erro no Passo 1
      setTestStatus({ show: true, color: "error", message });
    } finally {
      setIsCreatingSystem(false);
    }
  };

  // Teste Padrão (RH/IDM)
  const handleTestConnection = async () => {
    setTestStatus({ show: false });
    if (formData.databaseType === "CSV") {
      await handleTestDirectory(formData.diretorio, setIsTesting, setTestStatus);
    } else {
      setTestStatus({ show: true, color: "warning", message: "Teste de DB (RH/IDM) não implementado." });
    }
  };

  // Teste Específico: Contas
  const handleTestContas = async () => {
    setTestStatusContas({ show: false });
    if (formData.tipo_fonte_contas === "CSV") {
      await handleTestDirectory(formData.diretorio_contas, setIsTestingContas, setTestStatusContas);
    } else {
      setTestStatusContas({ show: true, color: "warning", message: "Teste de DB (Contas) não implementado." });
    }
  };

  // Teste Específico: Recursos
  const handleTestRecursos = async () => {
    setTestStatusRecursos({ show: false });
    if (formData.tipo_fonte_recursos === "CSV") {
      await handleTestDirectory(formData.diretorio_recursos, setIsTestingRecursos, setTestStatusRecursos);
    } else {
      setTestStatusRecursos({ show: true, color: "warning", message: "Teste de DB (Recursos) não implementado." });
    }
  };

  // Função de Teste Genérica (Helper)
  const handleTestDirectory = async (diretorio, setLoading, setStatus) => {
    if (!diretorio) {
      setStatus({ show: true, color: "warning", message: "Por favor, insira um diretório para testar." });
      return;
    }
    
    setLoading(true);
    setStatus({ show: true, color: "info", message: "Testando conexão com o arquivo..." });

    try {
      const response = await api.post("/datasources/test-csv", { diretorio });
      setStatus({ 
        show: true, 
        color: "success", 
        message: `Sucesso! Cabeçalho: ${response.data.header.substring(0, 50)}...` 
      });
    } catch (error) {
      const message = error.response?.data?.message || "Erro desconhecido.";
      setStatus({ show: true, color: "error", message: `Falha: ${message}` });
    } finally {
      setLoading(false);
    }
  };
  
  // (renderDynamicFields mantido para DBs futuros)
  const renderDynamicFields = (type, prefix = "") => {
    return null; 
  };
  
  // Lógica de Validação para o botão "Salvar"
  const getSaveDisabled = () => {
    // Modo de Edição: Permite salvar se não estiver testando
    if (initialData) {
      return isTestingContas || isTestingRecursos;
    }

    // Modo de Criação (Padrão RH/IDM)
    if (step === 0) { 
      return (formData.databaseType === "CSV" && testStatus.color !== "success") || isTesting;
    }
    
    // Modo de Criação (Sistema - Passo 2)
    if (step === 2) {
      // (Simplificado: ambos devem ser CSV e ambos devem ter sucesso)
      const contasOk = formData.tipo_fonte_contas === "CSV" && testStatusContas.color === "success";
      const recursosOk = formData.tipo_fonte_recursos === "CSV" && testStatusRecursos.color === "success";
      
      // Desabilita se os testes não passaram OU se o systemId não foi criado no passo 1
      return !contasOk || !recursosOk || !formData.systemId || isTestingContas || isTestingRecursos;
    }
    
    return true; // Desabilitado no Passo 1 (botão "Próximo" tem sua própria lógica)
  };
  
  
  // Renderização do Passo 0 (Padrão: RH/IDM)
  const renderStep0 = () => (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <MDInput label="Name" name="name" value={formData.name} onChange={handleInputChange} fullWidth autoFocus />
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
            options={origemOptions}
            value={formData.origem || null}
            onChange={(e, nv) => handleAutocompleteChange("origem", nv)}
            renderInput={(params) => <MDInput {...params} label="Origem" />}
            fullWidth
          />
        </Grid>
        
        {/* Lógica para RH/IDM */}
        {formData.origem === "RH" && (
          <>
            <Grid item xs={12}>
              <Autocomplete
                options={["CSV"]} // RH por enquanto só suporta CSV
                value={formData.databaseType || null}
                readOnly
                onChange={(e, nv) => handleAutocompleteChange("databaseType", nv)}
                renderInput={(params) => <MDInput {...params} label="Tipo de Fonte" />}
                fullWidth
              />
            </Grid>
            <Grid item xs={12}>
              <MDInput
                label="Diretório (Caminho no Servidor)"
                name="diretorio"
                value={formData.diretorio}
                onChange={handleInputChange}
                fullWidth
                placeholder="/app/files/rh.csv"
              />
            </Grid>
          </>
        )}
        
        {/* (Aqui entraria a lógica futura do IDM) */}

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
        {formData.origem === "RH" && (
          <MDButton variant="gradient" color="success" onClick={handleTestConnection} disabled={isTesting} sx={{ mr: 2 }}>
            {isTesting ? "Testando..." : "Testar"}
          </MDButton>
        )}
        <MDButton variant="gradient" color="info" onClick={handleSave} disabled={getSaveDisabled()}>
          Salvar
        </MDButton>
      </MDBox>
    </>
  );

  // Renderização do Passo 1 (Sistema: Info)
  const renderStep1 = () => (
    <>
      <Grid container spacing={3}>
        <Grid item xs={12}>
          <MDInput label="Nome do Sistema (Ex: SAP, Active Directory)" name="name" value={formData.name} onChange={handleInputChange} fullWidth autoFocus />
        </Grid>
        <Grid item xs={12}>
          <Autocomplete
            options={origemOptions}
            value={formData.origem || null}
            readOnly={!initialData} // Trava a "Origem" se for edição
            onChange={(e, nv) => handleAutocompleteChange("origem", nv)}
            renderInput={(params) => <MDInput {...params} label="Origem" />}
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <MDInput label="Descrição (Opcional)" name="description" value={formData.description} onChange={handleInputChange} fullWidth multiline rows={3} />
        </Grid>
      </Grid>
      
      {/* Alerta de erro do Passo 1 (ex: sistema já existe) */}
      <Collapse in={testStatus.show}>
        <MDAlert color={testStatus.color} sx={{ mt: 2, mb: 0 }}>
          <MDTypography variant="caption" color="white">{testStatus.message}</MDTypography>
        </MDAlert>
      </Collapse>
      
      <MDBox mt={4} display="flex" justifyContent="flex-end">
        <MDButton variant="gradient" color="secondary" onClick={onClose} sx={{ mr: 2 }}>Cancelar</MDButton>
        <MDButton variant="gradient" color="info" onClick={handleNextStep} disabled={!formData.name || isCreatingSystem}>
          {isCreatingSystem ? "Criando..." : "Próximo"}
        </MDButton>
      </MDBox>
    </>
  );

  // Renderização do Passo 2 (Sistema: Conexões)
  const renderStep2 = () => (
    <>
      <Grid container spacing={3}>
      
        {/* Título de Edição */}
        {initialData && (
          <Grid item xs={12}>
            <MDTypography variant="h6" fontWeight="medium">
              Editando Configurações para: {initialData.name_datasource}
            </MDTypography>
            <hr/>
          </Grid>
        )}
      
        {/* --- Seção Contas --- */}
        <Grid item xs={12}>
          <MDTypography variant="h6" fontWeight="medium">Configuração de Contas</MDTypography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={tipoFonteSistemaOptions}
            value={formData.tipo_fonte_contas || null}
            onChange={(e, nv) => handleAutocompleteChange("tipo_fonte_contas", nv)}
            renderInput={(params) => <MDInput {...params} label="Tipo de Fonte (Contas)" />}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          {formData.tipo_fonte_contas === "CSV" && (
            <MDInput
              label="Diretório de Contas"
              name="diretorio_contas"
              value={formData.diretorio_contas}
              onChange={handleInputChange}
              fullWidth
              placeholder="/app/files/sap_accounts.csv"
            />
          )}
          {/* (Campos de DB para Contas virão aqui) */}
        </Grid>
        
        {/* --- Seção Recursos --- */}
        <Grid item xs={12} sx={{ mt: 2 }}>
          <MDTypography variant="h6" fontWeight="medium">Configuração de Recursos (Acessos)</MDTypography>
        </Grid>
        <Grid item xs={12} md={6}>
          <Autocomplete
            options={tipoFonteSistemaOptions}
            value={formData.tipo_fonte_recursos || null}
            onChange={(e, nv) => handleAutocompleteChange("tipo_fonte_recursos", nv)}
            renderInput={(params) => <MDInput {...params} label="Tipo de Fonte (Recursos)" />}
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={6}>
          {formData.tipo_fonte_recursos === "CSV" && (
            <MDInput
              label="Diretório de Recursos"
              name="diretorio_recursos"
              value={formData.diretorio_recursos}
              onChange={handleInputChange}
              fullWidth
              placeholder="/app/files/sap_resources.csv"
            />
          )}
          {/* (Campos de DB para Recursos virão aqui) */}
        </Grid>
        
      </Grid>
      
      {/* Alertas de Teste (Contas) */}
      <Collapse in={testStatusContas.show}>
        <MDAlert color={testStatusContas.color} sx={{ mt: 2, mb: 0 }}>
          <MDTypography variant="caption" color="white">[CONTAS] {testStatusContas.message}</MDTypography>
        </MDAlert>
      </Collapse>
      
      {/* Alertas de Teste (Recursos) */}
      <Collapse in={testStatusRecursos.show}>
        <MDAlert color={testStatusRecursos.color} sx={{ mt: 1, mb: 0 }}>
          <MDTypography variant="caption" color="white">[RECURSOS] {testStatusRecursos.message}</MDTypography>
        </MDAlert>
      </Collapse>
      
      <MDBox mt={4} display="flex" justifyContent="space-between" alignItems="center">
        <MDButton variant="gradient" color="secondary" onClick={() => setStep(1)}>
          Voltar
        {/* ======================= INÍCIO DA CORREÇÃO ======================= */}
        </MDButton>
        {/* ======================== FIM DA CORREÇÃO ========================= */}
        <MDBox>
          <Tooltip title="Testar conexão com fonte de Contas">
            <MDButton variant="gradient" color="success" onClick={handleTestContas} disabled={isTestingContas || formData.tipo_fonte_contas !== 'CSV'} sx={{ mr: 1 }}>
              {isTestingContas ? "..." : "Testar Contas"}
            </MDButton>
          </Tooltip>
          <Tooltip title="Testar conexão com fonte de Recursos">
            <MDButton variant="gradient" color="success" onClick={handleTestRecursos} disabled={isTestingRecursos || formData.tipo_fonte_recursos !== 'CSV'} sx={{ mr: 2 }}>
              {isTestingRecursos ? "..." : "Testar Recursos"}
            </MDButton>
          </Tooltip>
          <MDButton variant="gradient" color="info" onClick={handleSave} disabled={getSaveDisabled()}>
            Salvar
          </MDButton>
        </MDBox>
      </MDBox>
    </>
  );
      
  return (
    <Modal open={open} onClose={onClose} sx={{ display: "grid", placeItems: "center" }}>
      <Card sx={{ width: "90%", maxWidth: "600px", overflowY: "auto", maxHeight: "90vh" }}>
        <MDBox p={3}>
          <MDTypography variant="h5">Adicionar/Editar Fonte de Dados</MDTypography>
        </MDBox>
        <MDBox component="form" p={3} pt={0}>
          {step === 0 && renderStep0()}
          {formData.origem === 'SISTEMA' && step === 1 && renderStep1()}
          {formData.origem === 'SISTEMA' && step === 2 && renderStep2()}
        </MDBox>
      </Card>
    </Modal>
  );
}

DataSourceModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialData: PropTypes.object,
  darkMode: PropTypes.bool,
};

DataSourceModal.defaultProps = {
  initialData: null,
  darkMode: false,
};

export default DataSourceModal;