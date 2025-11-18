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

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import MDAlert from "components/MDAlert";

const tipoFonteSistemaOptions = ["CSV", "DATABASE", "API"];

function SistemaDataSourceModal({ open, onClose, onSave, initialData }) {
  
  // Passo 0: Nome/Descrição (apenas em Edição)
  // Passo 1: Informações Básicas do Sistema (Criação)
  // Passo 2: Configuração de Conexão (Contas/Recursos)
  const [step, setStep] = useState(1); 
  const [isCreatingSystem, setIsCreatingSystem] = useState(false);
  
  const defaultState = {
    name: "",
    origem: "SISTEMA",
    description: "",
    
    // Campos Sistema
    systemId: null, // ID do sistema criado no catálogo
    
    // Config Contas
    tipo_fonte_contas: "CSV",
    diretorio_contas: "",
    testStatusContas: { show: false, color: "info", message: "" },
    isTestingContas: false,

    // Config Recursos
    tipo_fonte_recursos: "CSV",
    diretorio_recursos: "",
    testStatusRecursos: { show: false, color: "info", message: "" },
    isTestingRecursos: false,
  };

  const [formData, setFormData] = useState(defaultState);
  
  // API
  const api = axios.create({
    baseURL: "/",
    headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
  });
  
  // Carrega dados iniciais ao abrir o modal
  useEffect(() => {
    if (open) {
      if (initialData) {
        // MODO EDIÇÃO: Pula para o Passo 2
        setStep(2); 
        const config = initialData.systemConfig || {};
        
        setFormData({
            ...defaultState,
            name: initialData.name_datasource || "",
            description: initialData.description_datasource || "",
            systemId: config.systemId || null,
            tipo_fonte_contas: config.tipo_fonte_contas || "CSV",
            diretorio_contas: config.diretorio_accounts || "",
            tipo_fonte_recursos: config.tipo_fonte_recursos || "CSV",
            diretorio_recursos: config.diretorio_resources || "",
            // Reseta status de teste para evitar falso positivo ao editar
            testStatusContas: { show: false }, 
            testStatusRecursos: { show: false }, 
        });
        
      } else {
        // MODO CRIAÇÃO: Começa no Passo 1
        setStep(1); 
        setFormData(defaultState);
      }
    }
  }, [initialData, open]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleAutocompleteChange = (name, newValue) => {
    setFormData((prev) => ({ ...prev, [name]: newValue }));
  };
  
  // --- Lógica do Wizard ---

  // Passo 1 para 2: Cria o Sistema no Catálogo
  const handleNextStep = async () => {
    if (!formData.name) return;
    
    // FIX: Se o systemId JÁ EXISTE (usuário voltou), apenas avança.
    if (formData.systemId !== null) {
      setStep(2);
      return;
    }
    
    setIsCreatingSystem(true);
    
    try {
      const response = await api.post("/systems-catalog", {
        name_system: formData.name,
        description_system: formData.description
      });

      const newSystemId = response.data.id;
      setFormData(prev => ({ ...prev, systemId: newSystemId }));
      setStep(2); // Avança para o Passo 2

    } catch (error) {
      const message = error.response?.data?.message || "Erro ao criar o sistema no catálogo.";
      // Atualiza o estado de erro local (usando o de Contas como genérico para o Passo 1)
      setFormData(prev => ({ ...prev, testStatusContas: { show: true, color: "error", message } }));
    } finally {
      setIsCreatingSystem(false);
    }
  };

  // --- Lógica de Teste (CSV Genérico) ---
  const handleTestDirectory = async (diretorio, setTesting, setStatusState) => {
    if (!diretorio) {
        setFormData(prev => ({ ...prev, [setStatusState]: { show: true, color: "warning", message: "Insira o diretório para testar." } }));
        return;
    }
    
    setFormData(prev => ({ ...prev, [setTesting]: true, [setStatusState]: { show: true, color: "info", message: "Testando conexão com o arquivo..." } }));

    try {
      const response = await api.post("/datasources/test-csv", { diretorio });
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
  
  // Teste Específico: Contas
  const handleTestContas = () => {
    if (formData.tipo_fonte_contas === "CSV") {
      handleTestDirectory(formData.diretorio_contas, 'isTestingContas', 'testStatusContas');
    } else {
      setFormData(prev => ({ ...prev, testStatusContas: { show: true, color: "warning", message: "Teste de DB/API (Contas) não implementado." } }));
    }
  };

  // Teste Específico: Recursos
  const handleTestRecursos = () => {
    if (formData.tipo_fonte_recursos === "CSV") {
      handleTestDirectory(formData.diretorio_recursos, 'isTestingRecursos', 'testStatusRecursos');
    } else {
      setFormData(prev => ({ ...prev, testStatusRecursos: { show: true, color: "warning", message: "Teste de DB/API (Recursos) não implementado." } }));
    }
  };

  // Lógica de Validação para o botão "Salvar" (Passo 2)
  const getSaveDisabled = () => {
      // Requer testes bem-sucedidos (apenas CSV implementado)
      const contasOk = formData.tipo_fonte_contas !== "CSV" || formData.testStatusContas.color === "success";
      const recursosOk = formData.tipo_fonte_recursos !== "CSV" || formData.testStatusRecursos.color === "success";
      
      // Desabilita se os testes não passaram OU se o systemId não foi criado/não existe
      return !contasOk || !recursosOk || !formData.systemId || formData.isTestingContas || formData.isTestingRecursos;
  };
  
  const handleSave = () => {
    // Passa os dados para a função de salvamento do componente pai
    onSave(formData); 
  };
  
  // --- Renderização Condicional do Step ---
  
  const renderStep = () => {
    // Passo 1: Informações Básicas
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
            
            <Collapse in={formData.testStatusContas.show && formData.testStatusContas.color === 'error'}>
                <MDAlert color="error" sx={{ mt: 2, mb: 0 }}>
                    <MDTypography variant="caption" color="white">{formData.testStatusContas.message}</MDTypography>
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
    }
    
    // Passo 2: Configuração de Conexão
    if (step === 2) {
      return (
        <>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <MDTypography variant="h6" fontWeight="medium" mb={1}>Configuração de Contas</MDTypography>
                    <Autocomplete
                        options={tipoFonteSistemaOptions}
                        value={formData.tipo_fonte_contas || null}
                        onChange={(e, nv) => handleAutocompleteChange("tipo_fonte_contas", nv)}
                        renderInput={(params) => <MDInput {...params} label="Tipo de Fonte (Contas)" />}
                        fullWidth
                    />
                    {formData.tipo_fonte_contas === "CSV" && (
                        <MDInput
                            label="Diretório de Contas"
                            name="diretorio_contas"
                            value={formData.diretorio_contas}
                            onChange={handleInputChange}
                            fullWidth sx={{ mt: 2 }}
                            placeholder="/app/files/system_accounts.csv"
                        />
                    )}
                </Grid>
                
                <Grid item xs={12} sx={{ mt: 2 }}>
                    <MDTypography variant="h6" fontWeight="medium" mb={1}>Configuração de Recursos (Acessos)</MDTypography>
                    <Autocomplete
                        options={tipoFonteSistemaOptions}
                        value={formData.tipo_fonte_recursos || null}
                        onChange={(e, nv) => handleAutocompleteChange("tipo_fonte_recursos", nv)}
                        renderInput={(params) => <MDInput {...params} label="Tipo de Fonte (Recursos)" />}
                        fullWidth
                    />
                    {formData.tipo_fonte_recursos === "CSV" && (
                        <MDInput
                            label="Diretório de Recursos"
                            name="diretorio_recursos"
                            value={formData.diretorio_recursos}
                            onChange={handleInputChange}
                            fullWidth sx={{ mt: 2 }}
                            placeholder="/app/files/system_resources.csv"
                        />
                    )}
                </Grid>
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
            
            <MDBox mt={4} display="flex" justifyContent="space-between" alignItems="center">
                {!initialData && (
                    <MDButton variant="gradient" color="secondary" onClick={() => setStep(1)}>
                        Voltar
                    </MDButton>
                )}
                <MDBox ml="auto" display="flex" alignItems="center">
                    <Tooltip title="Testar conexão com fonte de Contas">
                        <MDButton variant="gradient" color="success" onClick={handleTestContas} disabled={formData.isTestingContas || formData.tipo_fonte_contas !== 'CSV'} sx={{ mr: 1 }}>
                            {formData.isTestingContas ? "..." : "Testar Contas"}
                        </MDButton>
                    </Tooltip>
                    <Tooltip title="Testar conexão com fonte de Recursos">
                        <MDButton variant="gradient" color="success" onClick={handleTestRecursos} disabled={formData.isTestingRecursos || formData.tipo_fonte_recursos !== 'CSV'} sx={{ mr: 2 }}>
                            {formData.isTestingRecursos ? "..." : "Testar Recursos"}
                        </MDButton>
                    </Tooltip>
                    <MDButton variant="gradient" color="info" onClick={handleSave} disabled={getSaveDisabled()}>
                        Salvar
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