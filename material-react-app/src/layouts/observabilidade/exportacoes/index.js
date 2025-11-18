// material-react-app/src/layouts/observabilidade/exportacoes/index.js

import { useState, useEffect, useMemo } from "react"; // <-- ADICIONADO useMemo

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Autocomplete from "@mui/material/Autocomplete";
import Menu from "@mui/material/Menu";
import Icon from "@mui/material/Icon";
import Divider from "@mui/material/Divider";
import TextField from "@mui/material/TextField";
// ======================= INÍCIO DA ALTERAÇÃO =======================
import Chip from "@mui/material/Chip"; // <-- NOVO: Para os "Pills"
import Stack from "@mui/material/Stack"; // <-- NOVO: Para layout dos "Pills"
// ======================== FIM DA ALTERAÇÃO =========================


// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDButton from "components/MDButton";
import MDInput from "components/MDInput";
import MDSnackbar from "components/MDSnackbar"; 

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";
// import Footer from "examples/Footer"; // <-- REMOVIDO

// Data handling
import axios from "axios";

// Importar o hook de contexto para pegar o token
import { useMaterialUIController } from "context";

// --- DEFINIÇÕES DOS FILTROS AVANÇADOS (Baseado nos manuais) ---
const initialAdvancedFilters = {
  identityStatus: "todos",
  accountStatus: "todos",
  divergenceType: null, 
  perfil: "",
  userType: "", 
  divergenceStatus: "divergent_only", 
};

const identityStatusOptions = [
  { value: "todos", label: "Todos os Status (Identidade)" },
  { value: "Ativo", label: "Identidade Ativa" },
  { value: "Inativo", label: "Identidade Inativa" },
];
const accountStatusOptions = [
  { value: "todos", label: "Todos os Status (Conta)" },
  { value: "Ativo", label: "Conta Ativa" },
  { value: "Inativo", label: "Conta Inativa" },
];
const divergenceTypeOptions = [
  { code: "TODAS", label: 'Qualquer Divergência' }, 
  { code: "ZOMBIE_ACCOUNT", label: 'Conta Zumbi (Ativo Indevido)' },
  { code: "ORPHAN_ACCOUNT", label: 'Conta Órfã' },
  { code: "ACCESS_NOT_GRANTED", label: 'Acesso Não Concedido' },
  { code: "CPF_MISMATCH", label: 'Divergência de CPF' },
  { code: "NAME_MISMATCH", label: 'Divergência de Nome' },
  { code: "EMAIL_MISMATCH", label: 'Divergência de E-mail' },
  { code: "DORMANT_ADMIN", label: 'Admin Dormente' },
  { code: "SOD_VIOLATION", label: 'Violação de SoD' },
];

// --- DEFINIÇÕES DO NOVO FILTRO DE STATUS DE DIVERGÊNCIA ---
const divergenceStatusOptions = [
  { value: "divergent_only", label: "Apenas Divergências Ativas" },
  { value: "exceptions_only", label: "Apenas Exceções (Ignorados)" },
  { value: "all", label: "Mostrar Todos (Divergentes + Ignorados)" },
];

// --- DEFINIÇÕES DO FORMATO DE EXPORTAÇÃO ---
const exportFormatOptions = [
  { value: "csv", label: "CSV (.csv)", mime: "text/csv; charset=utf-8" },
  { value: "xlsx", label: "Excel (.xlsx)", mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" },
  { value: "pdf", label: "PDF (.pdf)", mime: "application/pdf" }, // <-- 'disabled: true' REMOVIDO
];


function PaginaExportacoes() {
  const [controller] = useMaterialUIController();
  const { token, darkMode } = controller; 

  // --- States dos Filtros Principais ---
  const [reportType, setReportType] = useState("contas");
  const [systemId, setSystemId] = useState("todos");
  const [exportFormat, setExportFormat] = useState("csv"); 

  // --- States dos Filtros Avançados ---
  const [anchorEl, setAnchorEl] = useState(null);
  const openAdvancedFilters = Boolean(anchorEl);
  const [advancedFilters, setAdvancedFilters] = useState(initialAdvancedFilters);
  const [tempFilters, setTempFilters] = useState(initialAdvancedFilters);

  // --- States de Controle ---
  const [loadingSystems, setLoadingSystems] = useState(true); 
  const [isExporting, setIsExporting] = useState(false); 
  const [systemList, setSystemList] = useState([]);
  const [notification, setNotification] = useState({ open: false, color: "info", title: "", content: "" });
  const closeNotification = () => setNotification({ ...notification, open: false });

  // Lista estática dos tipos de relatório
  const reportTypes = [
    { value: "contas", label: "Relatório de Contas" },
    { value: "identidades", label: "Relatório de Identidades (RH)" },
  ];

  // (useEffect fetchSystems inalterado)
  useEffect(() => {
    const fetchSystems = async () => {
      if (!token) { setLoadingSystems(false); return; }
      try {
        setLoadingSystems(true);
        const response = await axios.get("/systems-catalog", { headers: { Authorization: `Bearer ${token}` } });
        setSystemList(response.data);
      } catch (error) { console.error("Erro ao buscar sistemas:", error); } 
      finally { setLoadingSystems(false); }
    };
    fetchSystems();
  }, [token]); 

  // (useEffect Lógica de filtros dependentes inalterado)
  useEffect(() => {
    if (reportType !== 'contas') { setSystemId('todos'); }
  }, [reportType]);

  // --- Handlers dos Filtros Avançados (inalterados, são genéricos) ---
  const handleOpenAdvancedFilters = (event) => { setTempFilters(advancedFilters); setAnchorEl(event.currentTarget); };
  const handleCloseAdvancedFilters = () => setAnchorEl(null);
  const handleApplyAdvancedFilters = () => { setAdvancedFilters(tempFilters); handleCloseAdvancedFilters(); };
  const handleClearAdvancedFilters = () => { setAdvancedFilters(initialAdvancedFilters); setTempFilters(initialAdvancedFilters); handleCloseAdvancedFilters(); };
  const handleTempFilterChange = (e) => { const { name, value } = e.target; setTempFilters(prev => ({ ...prev, [name]: value })); };
  const handleTempAutocompleteChange = (name, value) => { setTempFilters(prev => ({ ...prev, [name]: value })); };

  // ======================= INÍCIO DA ALTERAÇÃO =======================
  /**
   * Remove um filtro avançado específico (chamado pelo 'X' do Chip)
   */
  const handleRemoveAdvancedFilter = (filterKey) => {
    // Reseta o filtro específico para o seu valor inicial padrão
    setAdvancedFilters(prev => ({
      ...prev,
      [filterKey]: initialAdvancedFilters[filterKey]
    }));
  };
  // ======================== FIM DA ALTERAÇÃO =========================


  /**
   * @function handleGerarExportacao
   * Chama o backend, solicita a exportação e força o download do CSV.
   */
  const handleGerarExportacao = async () => {
    if (!token) {
      setNotification({ open: true, color: "error", title: "Erro", content: "Sessão inválida. Faça login novamente." });
      return;
    }
    setIsExporting(true);
    closeNotification(); 

    try {
      // Payload (inalterado, pois já envia 'advancedFilters' completo)
      const payload = { 
        reportType, 
        systemId,
        advancedFilters: advancedFilters,
        exportFormat: exportFormat 
      };

      const response = await axios.post("/exports", payload, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob', 
      });

      // Lógica de download (inalterada)
      const selectedFormat = exportFormatOptions.find(f => f.value === exportFormat) || exportFormatOptions[0];
      const blob = new Blob([response.data], { type: selectedFormat.mime });
      const contentDisposition = response.headers['content-disposition'];
      let filename = `export_${reportType}.${selectedFormat.value}`; 
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch && filenameMatch.length > 1) {
          filename = filenameMatch[1]; 
        }
      }
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (error) {
      // (Lógica de tratamento de erro inalterada...)
      let errorMessage = "Erro inesperado ao gerar exportação.";
      if (error.response && error.response.data instanceof Blob) {
        try {
          const errorText = await error.response.data.text();
          const errorJson = JSON.parse(errorText); 
          errorMessage = errorJson.message || errorMessage;
        } catch (parseError) { errorMessage = "Erro ao ler a resposta do servidor."; }
      } else if (error.response && error.response.data?.message) {
        errorMessage = error.response.data.message;
      }
      setNotification({ open: true, color: "error", title: "Erro ao Gerar", content: errorMessage });
    } finally {
      setIsExporting(false);
    }
  };

  // Lógica para o dropdown de Sistema
  const todosSistemas = { id: "todos", name_system: "Todos os Sistemas" };
  const systemOptions = [todosSistemas, ...systemList];
  const currentSystemValue = systemOptions.find(s => s.id === systemId) || todosSistemas;
  
  // Lógica para desabilitar o filtro de Sistema
  const isSystemFilterDisabled = loadingSystems || isExporting || reportType !== 'contas';

  // ======================= INÍCIO DA ALTERAÇÃO =======================
  /**
   * Gera a lista de "Pills" (Chips) para os filtros avançados ativos
   */
  const activeFilterChips = useMemo(() => {
    const chips = [];
    const { 
      identityStatus, 
      accountStatus, 
      divergenceType, 
      perfil, 
      userType, 
      divergenceStatus 
    } = advancedFilters;

    if (identityStatus !== initialAdvancedFilters.identityStatus) {
      const option = identityStatusOptions.find(o => o.value === identityStatus);
      chips.push({ key: 'identityStatus', label: `Status RH: ${option ? option.label : identityStatus}` });
    }
    if (accountStatus !== initialAdvancedFilters.accountStatus) {
      const option = accountStatusOptions.find(o => o.value === accountStatus);
      chips.push({ key: 'accountStatus', label: `Status Conta: ${option ? option.label : accountStatus}` });
    }
    if (divergenceType !== initialAdvancedFilters.divergenceType) {
      chips.push({ key: 'divergenceType', label: `Tipo Divergência: ${divergenceType.label}` });
    }
    if (perfil !== initialAdvancedFilters.perfil) {
      chips.push({ key: 'perfil', label: `Perfil: "${perfil}"` });
    }
    if (userType !== initialAdvancedFilters.userType) {
      chips.push({ key: 'userType', label: `Tipo Usuário: "${userType}"` });
    }
    if (divergenceStatus !== initialAdvancedFilters.divergenceStatus) {
      const option = divergenceStatusOptions.find(o => o.value === divergenceStatus);
      chips.push({ key: 'divergenceStatus', label: `Exibição: ${option ? option.label : divergenceStatus}` });
    }
    return chips;
  }, [advancedFilters]); // Recalcula sempre que os filtros aplicados mudarem
  // ======================== FIM DA ALTERAÇÃO =========================


  return (
    <DashboardLayout>
      <DashboardNavbar />
      
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              {/* Cabeçalho do Card */}
              <MDBox mx={2} mt={-3} py={3} px={2} variant="gradient" bgColor="info" borderRadius="lg" coloredShadow="info">
                <MDTypography variant="h6" color="white">
                  Gerador de Relatórios e Exportações
                </MDTypography>
              </MDBox>
              
              {/* Corpo do Card (Filtros e Ações) */}
              <MDBox pt={4} pb={3} px={3}>
                <MDBox component="form" role="form">
                  
                  {/* Título e Botão de Filtros Avançados */}
                  <MDBox display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                    <MDTypography variant="h5">
                      Selecionar Filtros
                    </MDTypography>
                    <MDButton variant="outlined" color="info" size="small" onClick={handleOpenAdvancedFilters}>
                      Filtros Avançados <Icon sx={{ ml: 1 }}>filter_list</Icon>
                    </MDButton>
                  </MDBox>
                  
                  {/* --- Área dos Filtros (Início) --- */}
                  {/* Linha 1 de Filtros (Filtros Principais) */}
                  <Grid container spacing={3}>
                    
                    {/* Filtro de Tipo de Relatório */}
                    <Grid item xs={12} md={6}>
                      <Autocomplete
                        options={reportTypes}
                        value={reportTypes.find(r => r.value === reportType) || null}
                        onChange={(event, newValue) => { setReportType(newValue ? newValue.value : "contas"); }}
                        getOptionLabel={(option) => option.label}
                        getOptionDisabled={(option) => option.disabled || false}
                        ListboxProps={{ sx: { backgroundColor: darkMode ? "grey.800" : "white" }, }}
                        renderInput={(params) => ( <MDInput {...params} label="Tipo de Relatório" variant="outlined" /> )}
                        disabled={loadingSystems || isExporting}
                        fullWidth
                      />
                    </Grid>

                    {/* Filtro de Sistema */}
                    <Grid item xs={12} md={6}>
                       <Autocomplete
                        options={systemOptions}
                        value={currentSystemValue}
                        onChange={(event, newValue) => { setSystemId(newValue ? newValue.id : "todos"); }}
                        getOptionLabel={(option) => option.name_system}
                        ListboxProps={{ sx: { backgroundColor: darkMode ? "grey.800" : "white" }, }}
                        renderInput={(params) => ( <MDInput {...params} label="Sistema" variant="outlined" /> )}
                        disabled={isSystemFilterDisabled} 
                        fullWidth
                      />
                    </Grid>
                  </Grid>
                  {/* --- Área dos Filtros (Fim) --- */}

                  {/* ======================= INÍCIO DA ALTERAÇÃO ======================= */}
                  {/* --- Área dos Filtros Avançados Ativos (Pills) --- */}
                  {activeFilterChips.length > 0 && (
                    <MDBox mt={2.5} mb={1}>
                      <MDTypography variant="caption" color="text" fontWeight="medium">
                        Filtros Avançados Ativos:
                      </MDTypography>
                      <Stack 
                        direction="row" 
                        spacing={1} 
                        mt={1} 
                        flexWrap="wrap" 
                        useFlexGap // Melhor para espaçamento com quebra de linha
                      >
                        {activeFilterChips.map((chip) => (
                          <Chip
                            key={chip.key}
                            label={chip.label}
                            onDelete={() => handleRemoveAdvancedFilter(chip.key)}
                            color="info"
                            variant="outlined"
                            sx={{ 
                              // Estilo para parecer nativo do template
                              backgroundColor: darkMode ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.08)",
                              borderColor: darkMode ? "rgba(255, 255, 255, 0.3)" : "rgba(0, 0, 0, 0.23)",
                              "& .MuiChip-deleteIcon": {
                                color: darkMode ? "white" : "text.secondary",
                                opacity: 0.7,
                                "&:hover": {
                                  color: "error.main",
                                  opacity: 1
                                }
                              }
                            }}
                          />
                        ))}
                      </Stack>
                    </MDBox>
                  )}
                  {/* ======================== FIM DA ALTERAÇÃO ========================= */}


                  {/* Botão de Ação e Seletor de Formato */}
                  <MDBox mt={4} mb={1} display="flex" justifyContent="flex-end" alignItems="center" gap={2}>
                    
                    {/* Novo Seletor de Formato de Saída */}
                    <MDBox sx={{ minWidth: 150 }}>
                      <Autocomplete
                        options={exportFormatOptions}
                        value={exportFormatOptions.find(f => f.value === exportFormat) || null}
                        onChange={(event, newValue) => {
                          setExportFormat(newValue ? newValue.value : "csv");
                        }}
                        getOptionLabel={(option) => option.label}
                        getOptionDisabled={(option) => option.disabled || false}
                        ListboxProps={{ sx: { backgroundColor: darkMode ? "grey.800" : "white" } }}
                        renderInput={(params) => (
                          <MDInput {...params} label="Formato de Saída" variant="outlined" />
                        )}
                        disabled={isExporting}
                        disableClearable
                      />
                    </MDBox>
                    
                    <MDButton 
                      variant="gradient" 
                      color="info" 
                      onClick={handleGerarExportacao}
                      disabled={loadingSystems || isExporting} 
                    >
                      {isExporting ? "Gerando..." : "Gerar Exportação"}
                    </MDButton>
                  </MDBox>

                </MDBox>
              </MDBox>
            </Card>
          </Grid>
        </Grid>
      </MDBox>
      
      {/* --- Menu de Filtros Avançados (Pop-over) --- */}
      <Menu 
        anchorEl={anchorEl} 
        open={openAdvancedFilters} 
        onClose={handleCloseAdvancedFilters} 
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} 
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { maxHeight: '80vh', overflowY: 'auto' } }}
      >
        <MDBox p={2} sx={{ width: '350px' }}>
          <MDTypography variant="button" fontWeight="medium">Filtros de Métricas</MDTypography>
          
          {/* Filtro de Status da Identidade */}
          <MDBox mt={2}>
            <Autocomplete 
              options={identityStatusOptions}
              value={identityStatusOptions.find(o => o.value === tempFilters.identityStatus) || null}
              onChange={(e, val) => handleTempAutocompleteChange('identityStatus', val ? val.value : 'todos')} 
              getOptionLabel={(option) => option.label}
              ListboxProps={{ sx: { backgroundColor: darkMode ? "grey.800" : "white" } }}
              renderInput={(params) => <TextField {...params} label="Status da Identidade (RH)" size="small"/>} 
              fullWidth
            />
          </MDBox>
          
          {/* Filtro de Status da Conta */}
          <MDBox mt={2}>
            <Autocomplete 
              options={accountStatusOptions}
              value={accountStatusOptions.find(o => o.value === tempFilters.accountStatus) || null}
              onChange={(e, val) => handleTempAutocompleteChange('accountStatus', val ? val.value : 'todos')} 
              getOptionLabel={(option) => option.label}
              ListboxProps={{ sx: { backgroundColor: darkMode ? "grey.800" : "white" } }}
              renderInput={(params) => <TextField {...params} label="Status da Conta (App)" size="small"/>} 
              fullWidth
            />
          </MDBox>

          {/* Filtro de Tipo de Divergência */}
          <MDBox mt={2}>
            <Autocomplete 
              options={divergenceTypeOptions}
              getOptionLabel={(option) => option.label || ""}
              value={tempFilters.divergenceType}
              onChange={(event, newValue) => handleTempAutocompleteChange('divergenceType', newValue)} 
              isOptionEqualToValue={(option, value) => option.code === value?.code}
              ListboxProps={{ sx: { backgroundColor: darkMode ? "grey.800" : "white" } }}
              renderInput={(params) => <TextField {...params} label="Tipo de Divergência" size="small"/>} 
              fullWidth
            />
          </MDBox>

          {/* Novo Filtro: Status da Divergência (Ignorados) */}
          <MDBox mt={2}>
            <Autocomplete 
              options={divergenceStatusOptions}
              value={divergenceStatusOptions.find(o => o.value === tempFilters.divergenceStatus) || null}
              onChange={(e, val) => handleTempAutocompleteChange('divergenceStatus', val ? val.value : 'divergent_only')} 
              getOptionLabel={(option) => option.label}
              ListboxProps={{ sx: { backgroundColor: darkMode ? "grey.800" : "white" } }}
              renderInput={(params) => <TextField {...params} label="Status da Divergência" size="small"/>} 
              fullWidth
              disableClearable
            />
          </MDBox>

          {/* Novo Filtro: Tipo de Usuário (RH) */}
          <MDBox mt={2}>
            <TextField 
              label="Tipo de Usuário (RH) (Contém)" 
              name="userType" 
              value={tempFilters.userType} 
              onChange={handleTempFilterChange} 
              fullWidth 
              size="small" 
            />
          </MDBox>

          {/* Filtro de Perfil */}
          <MDBox mt={2} mb={2}>
            <TextField 
              label="Perfil/Recurso (Contém)" 
              name="perfil" 
              value={tempFilters.perfil} 
              onChange={handleTempFilterChange} 
              fullWidth 
              size="small" 
            />
          </MDBox>

          <Divider />
          
          {/* Ações do Menu */}
          <MDBox display="flex" justifyContent="space-between" mt={2}>
            <MDButton variant="text" color="secondary" size="small" onClick={handleClearAdvancedFilters}>Limpar</MDButton>
            <MDButton variant="gradient" color="info" size="small" onClick={handleApplyAdvancedFilters}>Aplicar</MDButton>
          </MDBox>
        </MDBox>
      </Menu>

      {/* Componente de Notificação para Erros/Sucesso */}
      <MDSnackbar
        color={notification.color}
        icon="notifications"
        title={notification.title}
        content={notification.content}
        dateTime="agora"
        open={notification.open}
        onClose={closeNotification}
        close={closeNotification}
      />
    </DashboardLayout>
  );
}

export default PaginaExportacoes;