// material-react-app/src/layouts/observabilidade/geral/components/LiveFeed.js

import React, { useMemo, useState, useEffect } from "react";
import PropTypes from "prop-types";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import axios from "axios";
import { useMaterialUIController } from "context";

// Componentes do Template
import Card from "@mui/material/Card";
import Icon from "@mui/material/Icon";
import Grid from "@mui/material/Grid";
import Modal from "@mui/material/Modal";
import Divider from "@mui/material/Divider";
import Menu from "@mui/material/Menu";
import { Box } from "@mui/material";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import CircularProgress from "@mui/material/CircularProgress";
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";
import DataTable from "examples/Tables/DataTable";
import colors from "assets/theme/base/colors";
import MDBadge from "components/MDBadge";
import Stack from "@mui/material/Stack"; // Adicionado para consistência com outros filtros
import Chip from "@mui/material/Chip";   // Adicionado para consistência

// --- COMPONENTE HELPER PADRONIZADO ---
function DetailItem({ icon, label, value, children, darkMode }) {
  const valueColor = darkMode ? "white" : "text.secondary";
  return (
    <MDBox display="flex" alignItems="center" mb={1.5} lineHeight={1}>
      <Icon color="secondary" fontSize="small" sx={{ mr: 1.5 }}>{icon}</Icon>
      <MDTypography variant="button" fontWeight="bold" color="text">{label}:&nbsp;</MDTypography>
      {value != null && value !== '' && (<MDTypography variant="button" fontWeight="regular" color={valueColor}>{value}</MDTypography>)}
        {!value && value !== 0 && value !== false && !children && (<MDTypography variant="button" fontWeight="regular" color={valueColor}>N/A</MDTypography>)}
      {children}
    </MDBox>
  );
}

DetailItem.propTypes = {
  icon: PropTypes.string.isRequired,
  label: PropTypes.string.isRequired,
  value: PropTypes.any,
  children: PropTypes.node,
  darkMode: PropTypes.bool,
};
DetailItem.defaultProps = {
  darkMode: false,
  value: null,
  children: null,
};


const DivergenceModal = React.forwardRef(({ user, onClose, darkMode, getDivergenceLabel }, ref) => {
  if (!user) return null; 

  const isIdentityOnly = user.divergenceDetails?.some(d => d.code === 'ACCESS_NOT_GRANTED');
  const identityData = isIdentityOnly ? user : (user.rhData || null);
  const accountData = isIdentityOnly ? null : user;

  const renderComparisonSection = () => {
    if (!user?.divergenceDetails || user.divergenceDetails.length === 0) {
      return (
        <MDBox display="flex" alignItems="center" mb={1}>
          <Icon color="success" fontSize="small" sx={{ mr: 1.5 }}>check_circle</Icon>
          <MDTypography variant="button" color={darkMode ? "white" : "text.secondary"}>
            Nenhuma inconsistência encontrada.
          </MDTypography>
        </MDBox>
      );
    }

    return user.divergenceDetails.map((divergence, index) => {
      const { code, rhData: divRhData, appData: divAppData, targetSystem, text } = divergence;
      let specificDetails = null;
      const appSystemName = divAppData?.system?.name_system || accountData?.sourceSystem || 'Sistema App';

      switch (code) {
        case "CPF_MISMATCH":
          specificDetails = (
            <>
              <DetailItem icon="badge" label={`CPF no RH`} value={divRhData?.cpf_hr} darkMode={darkMode} />
              <DetailItem icon="badge" label={`CPF em ${appSystemName}`} value={divAppData?.cpf_account || "N/A"} darkMode={darkMode} />
            </>
          );
          break;
        case "NAME_MISMATCH":
          specificDetails = (
            <>
              <DetailItem icon="person" label={`Nome no RH`} value={divRhData?.name_hr} darkMode={darkMode} />
              <DetailItem icon="person" label={`Nome em ${appSystemName}`} value={divAppData?.name_account} darkMode={darkMode} />
            </>
          );
          break;
        case "EMAIL_MISMATCH":
          specificDetails = (
            <>
              <DetailItem icon="email" label={`Email no RH`} value={divRhData?.email_hr} darkMode={darkMode} />
              <DetailItem icon="email" label={`Email em ${appSystemName}`} value={divAppData?.email_account} darkMode={darkMode} />
            </>
          );
          break;
        case "ZOMBIE_ACCOUNT":
          specificDetails = (
           <>
             <DetailItem icon="toggle_off" label={`Status no RH`} value={divRhData?.status_hr} darkMode={darkMode} />
             <DetailItem icon="toggle_on" label={`Status em ${appSystemName}`} value={divAppData?.status_account} darkMode={darkMode} />
           </>
          );
          break;
        case "ACCESS_NOT_GRANTED":
          specificDetails = <DetailItem icon="link_off" label={`Acesso esperado em`} value={targetSystem} darkMode={darkMode} />;
          break;
        case "ORPHAN_ACCOUNT":
          specificDetails = <DetailItem icon="person_off" label="Detalhe" value={text || "Conta sem vínculo com RH."} darkMode={darkMode} />
          break;
        case "DORMANT_ADMIN":
          specificDetails = <DetailItem icon="history_toggle_off" label="Detalhe" value={text || "Admin inativo."} darkMode={darkMode} />
          break;
        case "USERTYPE_MISMATCH":
          specificDetails = (
           <>
             <DetailItem icon="work_outline" label={`Tipo no RH`} value={divRhData?.user_type_hr} darkMode={darkMode} />
             <DetailItem icon="work" label={`Tipo em ${appSystemName}`} value={divAppData?.user_type_account} darkMode={darkMode} />
           </>
          );
          break;
        default:
          specificDetails = <DetailItem icon="warning" label="Detalhe" value={text || "Informação adicional indisponível."} darkMode={darkMode} />;
          break;
      }
      
      return (
        <MDBox key={`${code}-${index}`} mt={index > 0 ? 2.5 : 0}>
           <MDBox display="flex" alignItems="center" sx={{ mb: 1.5 }}>
             <Icon fontSize="small" sx={{ mr: 1.5 }} color="error">warning</Icon> 
             <MDTypography 
               variant="button" 
               fontWeight="medium" 
               color={darkMode ? "white" : "dark"}
             >
               {getDivergenceLabel(code)}
             </MDTypography>
           </MDBox>
           {specificDetails}
        </MDBox>
      );
    });
  };

  return (
    <Box ref={ref} tabIndex={-1}>
      <Card sx={{ width: "80vw", maxWidth: "700px", maxHeight: "90vh", overflowY: "auto" }}>
        <MDBox p={2} display="flex" justifyContent="space-between" alignItems="center">
          <MDTypography variant="h5">Detalhes da {isIdentityOnly ? "Identidade (RH)" : "Conta"}</MDTypography>
          <Icon
            sx={({ typography: { size }, palette: { dark, white } }) => ({
              fontSize: `${size.lg} !important`,
              color: darkMode ? white.main : dark.main,
              stroke: "currentColor",
              strokeWidth: "2px",
              cursor: "pointer",
            })}
            onClick={onClose}
          >
            close
          </Icon>
        </MDBox>
        
        <MDBox p={3} pt={1}>
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <MDTypography variant="h6" fontWeight="medium" sx={{ mb: 2 }}>
                {identityData ? "Identidade Vinculada (RH)" : "Identidade (RH)"}
              </MDTypography>
              {identityData ? (
                <>
                  <DetailItem icon="person" label="Nome" value={identityData.name_hr} darkMode={darkMode} />
                  <DetailItem icon="email" label="Email" value={identityData.email_hr} darkMode={darkMode} />
                  <DetailItem icon="badge" label="CPF" value={identityData.cpf_hr} darkMode={darkMode} />
                  <DetailItem icon="vpn_key" label="ID RH" value={identityData.identity_id_hr} darkMode={darkMode} />
                  <DetailItem icon="work" label="Tipo" value={identityData.user_type_hr} darkMode={darkMode} />
                  <DetailItem icon="approval" label="Status RH" value={identityData.status_hr} darkMode={darkMode} />
                </>
              ) : (
                <MDTypography variant="caption" color="textSecondary">Conta não vinculada (Órfã).</MDTypography>
              )}
            </Grid>
            
            <Grid item xs={12} md={6}>
              {isIdentityOnly ? (
                <MDBox>
                  <MDTypography variant="h6" fontWeight="medium" sx={{ mb: 2 }}>Inconsistência</MDTypography>
                  {renderComparisonSection()}
                </MDBox>
              ) : (
                <MDBox>
                  <MDTypography variant="h6" fontWeight="medium" sx={{ mb: 2 }}>Conta (Sistema)</MDTypography>
                  <DetailItem icon="computer" label="Sistema" value={accountData?.sourceSystem} darkMode={darkMode} /> 
                  <DetailItem icon="vpn_key" label="ID no Sistema" value={accountData?.id_user} darkMode={darkMode} />
                  <DetailItem icon="person_outline" label="Nome na Conta" value={accountData?.name} darkMode={darkMode} />
                  <DetailItem icon="badge" label="CPF na Conta" value={accountData?.cpf_account} darkMode={darkMode} />
                  <DetailItem icon="admin_panel_settings" label="Perfil App" value={accountData?.perfil} darkMode={darkMode} />
                  <DetailItem icon="apps" label="Status App" value={accountData?.app_status} darkMode={darkMode} />
                  <DetailItem icon="login" label="Último Login" value={accountData?.last_login ? new Date(accountData.last_login).toLocaleDateString('pt-BR') : ''} darkMode={darkMode} />
                </MDBox>
              )}
            </Grid>
          </Grid>

          {!isIdentityOnly && (
            <>
              <Divider sx={{ my: 2 }} />
              <MDBox>
                <MDTypography variant="h6" fontWeight="medium" sx={{ mb: 2 }}>
                  Inconsistências Encontradas
                </MDTypography>
                {renderComparisonSection()}
              </MDBox>
            </>
          )}
        </MDBox>
      </Card>
    </Box>
  );
});
DivergenceModal.displayName = 'DivergenceModal';


const AuthorCell = ({ nome, tipo }) => (
    <MDBox display="flex" alignItems="center" lineHeight={1}>
        <MDBox lineHeight={1}>
            <MDTypography display="block" variant="button" fontWeight="medium" sx={{ "&:hover": { color: colors.info.main }}}>
                {nome || "N/A"}
            </MDTypography>
            <MDTypography variant="caption">Tipo: {tipo || 'N/A'}</MDTypography>
        </MDBox>
    </MDBox>
);

const StatusCell = ({ status }) => {
    let color = "secondary";
    let text = status ? String(status).toUpperCase() : "-";
    if (text === "ATIVO") color = "success";
    if (text === "INATIVO") color = "error";
    if (text === "NÃO ENCONTRADO") color = "warning"; 
    return <MDTypography variant="caption" color={color} fontWeight="medium">{text}</MDTypography>;
};


function LiveFeed({ data, isLoading }) { 
    const [controller] = useMaterialUIController();
    const { token, darkMode } = controller;
    const [systemOptions, setSystemOptions] = useState([]);

    // --- CORREÇÃO: URL CORRETA ---
    const API_URL = process.env.REACT_APP_API_URL;

    const api = axios.create({
        baseURL: API_URL,
        headers: { Authorization: `Bearer ${token}` },
    });

    useEffect(() => {
        const fetchSystems = async () => {
            if (!token) return;
            try {
                // Agora usa a instância api configurada
                const response = await api.get('/systems');
                
                // Blindagem de Array
                const safeData = Array.isArray(response.data) ? response.data : [];
                
                const systemNamesSet = new Set(
                    safeData
                        .filter(ds => ds.origem_datasource === 'SISTEMA' && ds.systemConfig?.system?.name_system)
                        .map(ds => ds.systemConfig.system.name_system)
                );
                setSystemOptions(Array.from(systemNamesSet)); 
            } catch (error) {
                console.error("Erro ao buscar a lista de sistemas:", error);
            }
        };
        fetchSystems();
    }, [token]);


    const [searchTerm, setSearchTerm] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [anchorEl, setAnchorEl] = useState(null);
    
    const initialFilters = useMemo(() => ({ 
        nome: "", 
        email: "", 
        perfil: "", 
        sistema: null, 
        divergencia: null, 
        criticas: null, 
        divergenceType: null 
    }), []);

    const divergenceOptions = useMemo(() => [
        { code: 'ORPHAN_ACCOUNT', label: 'Conta Órfã' },
        { code: 'ZOMBIE_ACCOUNT', label: 'Acesso Ativo Indevido' },
        { code: 'ACCESS_NOT_GRANTED', label: 'Acesso Previsto Não Concedido' },
        { code: 'CPF_MISMATCH', label: 'Divergência de CPF' },
        { code: 'NAME_MISMATCH', label: 'Divergência de Nome' },
        { code: 'EMAIL_MISMATCH', label: 'Divergência de E-mail' },
        { code: 'USERTYPE_MISMATCH', label: 'Divergência de Tipo de Usuário' },
        { code: 'DORMANT_ADMIN', label: 'Admin Dormente' },
    ], []);

    const [filters, setFilters] = useState(initialFilters);
    const [tempFilters, setTempFilters] = useState(initialFilters);
    
    const open = Boolean(anchorEl);
    
    const divergenceLabels = useMemo(() => ({
        ACCESS_NOT_GRANTED: "Acesso Previsto Não Concedido",
        ZOMBIE_ACCOUNT: "Acesso Ativo Indevido",
        CPF_MISMATCH: "Divergência de CPF",
        NAME_MISMATCH: "Divergência de Nome",
        EMAIL_MISMATCH: "Divergência de E-mail",
        DORMANT_ADMIN: "Admin Dormente",
        ORPHAN_ACCOUNT: "Conta Órfã",
        USERTYPE_MISMATCH: "Divergência de Tipo de Usuário",
    }), []);
    const getDivergenceLabel = (code) => divergenceLabels[code] || code;
    
    // Event Handlers
    const handleFilterMenuOpen = (event) => { setTempFilters(filters); setAnchorEl(event.currentTarget); };
    const handleFilterMenuClose = () => setAnchorEl(null);
    const handleApplyFilters = () => { setFilters(tempFilters); handleFilterMenuClose(); };
    const handleClearFilters = () => { setFilters(initialFilters); setTempFilters(initialFilters); handleFilterMenuClose(); };
    const handleTempFilterChange = (e) => { const { name, value } = e.target; setTempFilters(prev => ({ ...prev, [name]: value })); };
    const handleTempAutocompleteChange = (name, value) => { setTempFilters(prev => ({ ...prev, [name]: value })); };
    const handleOpenModal = (user) => { setSelectedUser(user); setIsModalOpen(true); };
    const handleCloseModal = () => { setIsModalOpen(false); setSelectedUser(null); };

    // PDF Generation
    const handleGeneratePdf = () => {
        const doc = new jsPDF();
        const tableColumns = tableData.columns.map(c => c.Header); 
        const tableRows = [];

        // Safe check for rawData
        (tableData.rawData || []).forEach(user => {
            const rowData = [
                `${user.name || '-'} (Tipo: ${user.userType || 'N/A'})`,
                user.email || '-',
                user.sourceSystem || '-',
                user.rh_status || '-',
                user.app_status || '-',
                user.perfil || '-',
                user.divergence ? 'Sim' : 'Não',
                user.isCritical ? 'Sim' : 'Não',
            ];
            tableRows.push(rowData);
        });
        
        const adjustedColumns = tableColumns.map(col => col === 'NOME' ? 'NOME (TIPO)' : col);

        doc.text("Relatório - Live Feed", 14, 15);
        autoTable(doc, {
            head: [adjustedColumns],
            body: tableRows,
            startY: 20,
            styles: { fontSize: 8 }, 
            headStyles: { fillColor: [0, 123, 255] }, 
        });
        doc.save(`relatorio_live_feed_${new Date().toISOString().slice(0,10)}.pdf`);
    };


    // Memoized Table Data processing
    const tableData = useMemo(() => {
        // --- BLINDAGEM MÁXIMA ---
        let filteredData = Array.isArray(data) ? data : []; 
        
        // Apply Search Term
        if (searchTerm.trim() !== "") {
            const lowerSearch = searchTerm.toLowerCase();
            filteredData = filteredData.filter(user => 
                (user.name && user.name.toLowerCase().includes(lowerSearch)) ||
                (user.email && user.email.toLowerCase().includes(lowerSearch)) ||
                (user.id_user && String(user.id_user).toLowerCase().includes(lowerSearch)) || 
                (user.sourceSystem && user.sourceSystem.toLowerCase().includes(lowerSearch))
            );
        }
        
        // Apply Advanced Filters
        if (Object.keys(filters).some(key => filters[key] !== initialFilters[key])) {
             filteredData = filteredData.filter(u => {
                 const matchNome = !filters.nome || (u.name && u.name.toLowerCase().includes(filters.nome.toLowerCase()));
                 const matchEmail = !filters.email || (u.email && u.email.toLowerCase().includes(filters.email.toLowerCase()));
                 const matchPerfil = !filters.perfil || (u.perfil && u.perfil.toLowerCase().includes(filters.perfil.toLowerCase()));
                 const matchSistema = !filters.sistema || (u.sourceSystem && u.sourceSystem === filters.sistema);
                 const matchDivergencia = filters.divergencia === null || (filters.divergencia === 'Sim' ? u.divergence : !u.divergence);
                 const matchCriticas = filters.criticas === null || (filters.criticas === 'Sim' ? u.isCritical : !u.isCritical);
                 const matchDivergenceType = !filters.divergenceType || (u.divergenceDetails && u.divergenceDetails.some(d => d.code === filters.divergenceType.code));
                 
                 return matchNome && matchEmail && matchPerfil && matchSistema && matchDivergencia && matchCriticas && matchDivergenceType;
             });
        }
        
        // Map filtered data to table rows format
        const rows = filteredData.map(u => ({
          ...u, 
          nome: ( 
            <MDBox onClick={() => handleOpenModal(u)} sx={{ cursor: "pointer", width: '100%' }}>
              <AuthorCell nome={u.name} tipo={u.userType} />
            </MDBox>
          ),
          email: <MDTypography variant="caption">{u.email || '-'}</MDTypography>,
          sourceSystem: <MDTypography variant="caption">{u.sourceSystem}</MDTypography>,
          rh_status: <StatusCell status={u.rh_status} />,
          app_status: <StatusCell status={u.app_status} />,
          perfil: <MDTypography variant="caption">{u.perfil || '-'}</MDTypography>,
          diverg: <MDBadge badgeContent={u.divergence ? "Sim" : "Não"} color={u.divergence ? "error" : "success"} size="xs" container />,
          criticas: (
            <MDBadge 
              badgeContent={u.isCritical ? "Sim" : "Não"} 
              color={u.isCritical ? "error" : (u.divergence ? "warning" : "success")} 
              size="xs" 
              container 
            />
          ),
        }));

        return {
            columns: [ 
                { Header: "NOME", accessor: "nome", width: "20%", align: "left" }, 
                { Header: "EMAIL", accessor: "email", width: "20%", align: "left" }, 
                { Header: "SISTEMA", accessor: "sourceSystem", align: "center" },
                { Header: "STATUS RH", accessor: "rh_status", align: "center"},
                { Header: "STATUS APP", accessor: "app_status", align: "center"},
                { Header: "PERFIL", accessor: "perfil", align: "center" },
                { Header: "DIVERGÊNCIA", accessor: "diverg", align: "center" },
                { Header: "CRÍTICAS", accessor: "criticas", align: "center" },
            ],
            rows,
            rawData: filteredData, 
        };
    }, [data, filters, searchTerm, initialFilters]); 

    return (
        <>
            {isModalOpen && ( 
                <Modal open={isModalOpen} onClose={handleCloseModal} sx={{ display: "grid", placeItems: "center" }}>
                    <DivergenceModal 
                        user={selectedUser} 
                        onClose={handleCloseModal} 
                        darkMode={darkMode} 
                        getDivergenceLabel={getDivergenceLabel} 
                    />
                </Modal>
            )}

            <Card>
                <MDBox p={2} display="flex" justifyContent="space-between" alignItems="center" flexWrap="wrap"> 
                    <MDTypography variant="h4" fontWeight="bold" color="info" textGradient sx={{ flexShrink: 0, mr: 2 }}> 
                        Live Feed
                    </MDTypography>
                    <MDBox display="flex" alignItems="center" gap={1} sx={{ flexGrow: 1, justifyContent: { xs: 'center', md: 'flex-end' }, my: { xs: 1, md: 0 } }}> 
                        <MDButton variant="gradient" color="info" size="small" onClick={handleFilterMenuOpen} sx={{ minWidth: '100px'}}> 
                            Filtros <Icon>keyboard_arrow_down</Icon>
                        </MDButton>
                        <MDButton variant="outlined" color="info" size="small" onClick={handleGeneratePdf} sx={{ flexShrink: 0 }}>
                            <Icon>download</Icon>&nbsp;Relatório
                        </MDButton>
                    </MDBox>
                </MDBox>

                <Menu 
                    anchorEl={anchorEl} 
                    open={open} 
                    onClose={handleFilterMenuClose} 
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} 
                    transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    PaperProps={{ sx: { maxHeight: '80vh', overflowY: 'auto' } }} 
                >
                    <MDBox p={2} sx={{ width: '300px' }}>
                        <MDTypography variant="button" fontWeight="medium">Filtros Avançados</MDTypography>
                        <MDBox mt={2}><TextField label="Nome" name="nome" value={tempFilters.nome} onChange={handleTempFilterChange} fullWidth size="small" /></MDBox>
                        <MDBox mt={2}><TextField label="Email" name="email" value={tempFilters.email} onChange={handleTempFilterChange} fullWidth size="small" /></MDBox>
                        <MDBox mt={2}><TextField label="Perfil" name="perfil" value={tempFilters.perfil} onChange={handleTempFilterChange} fullWidth size="small" /></MDBox>
                        <MDBox mt={2}>
                            <Autocomplete 
                                options={systemOptions} 
                                getOptionLabel={(option) => option || ""}
                                value={tempFilters.sistema}
                                onChange={(event, newValue) => handleTempAutocompleteChange('sistema', newValue)} 
                                renderInput={(params) => <TextField {...params} label="Sistema" size="small"/>} 
                            />
                        </MDBox>
                        <MDBox mt={2}>
                            <Autocomplete 
                                options={[{ label: 'Todos', code: null }, ...divergenceOptions]} 
                                getOptionLabel={(option) => option.label || ""}
                                value={tempFilters.divergenceType?.code ? tempFilters.divergenceType : divergenceOptions.find(o => o.code === null)} 
                                onChange={(event, newValue) => handleTempAutocompleteChange('divergenceType', newValue?.code === null ? null : newValue)} 
                                isOptionEqualToValue={(option, value) => option.code === value?.code}
                                renderInput={(params) => <TextField {...params} label="Tipo de Divergência" size="small"/>} 
                            />
                        </MDBox>
                        
                        <MDBox mt={2}>
                            <Autocomplete 
                                options={['Sim', 'Não']} 
                                value={tempFilters.divergencia} 
                                onChange={(e, val) => handleTempAutocompleteChange('divergencia', val)} 
                                renderInput={(params) => <TextField {...params} label="Possui Divergência?" size="small"/>} 
                            />
                        </MDBox>
                        
                        <MDBox mt={2} mb={2}>
                            <Autocomplete 
                                options={['Sim', 'Não']} 
                                value={tempFilters.criticas} 
                                onChange={(e, val) => handleTempAutocompleteChange('criticas', val)} 
                                renderInput={(params) => <TextField {...params} label="Possui Críticas?" size="small"/>} 
                            />
                        </MDBox>

                        <Divider />
                        <MDBox display="flex" justifyContent="space-between" mt={2}>
                            <MDButton variant="text" color="secondary" size="small" onClick={handleClearFilters}>Limpar</MDButton>
                            <MDButton variant="gradient" color="info" size="small" onClick={handleApplyFilters}>Aplicar</MDButton>
                        </MDBox>
                    </MDBox>
                </Menu>
                
                <DataTable 
                    table={tableData} 
                    canSearch={true} 
                    showTotalEntries 
                    entriesPerPage={{ defaultValue: 10, entries: [5, 10, 25, 50, 100] }} 
                    isSorted={true} 
                    noEndBorder
                    isLoading={isLoading} 
                />
            </Card>
        </>
    );
}

LiveFeed.propTypes = {
    data: PropTypes.array, 
    isLoading: PropTypes.bool, 
};

LiveFeed.defaultProps = {
    data: [], 
    isLoading: false, 
};

export default LiveFeed;