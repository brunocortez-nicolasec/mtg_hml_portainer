// material-react-app/src/layouts/observabilidade/politicas/index.js

import { useState, useEffect, useMemo } from "react";
import axios from "axios"; 
import { useMaterialUIController } from "context"; 

// @mui material components
import Grid from "@mui/material/Grid";
import Card from "@mui/material/Card";
import Tabs from "@mui/material/Tabs";
import Tab from "@mui/material/Tab";
import Icon from "@mui/material/Icon";
import CircularProgress from "@mui/material/CircularProgress"; 

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDSnackbar from "components/MDSnackbar"; 

// Material Dashboard 2 React example components
import DashboardLayout from "examples/LayoutContainers/DashboardLayout";
import DashboardNavbar from "examples/Navbars/DashboardNavbar";

// --- Importação dos novos componentes de Aba ---
import RbacTab from "./components/RbacTab";
import SodTab from "./components/SodTab";

// Componente interno para renderizar o conteúdo da aba
function TabPanel(props) {
  const { children, value, index, ...other } = props;
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`politicas-tabpanel-${index}`}
      aria-labelledby={`politicas-tab-${index}`}
      {...other}
    >
      {value === index && <MDBox sx={{ p: 3 }}>{children}</MDBox>}
    </div>
  );
}

// ======================= INÍCIO DA CORREÇÃO (Atributos Estáticos) =======================
// Não precisamos de uma chamada de API para isso, 
// são os campos do modelo IdentitiesHR do Prisma.
const allAttributes = [
  { id: "name_hr", name: "Nome" },
  { id: "email_hr", name: "Email" },
  { id: "status_hr", name: "Status" },
  { id: "user_type_hr", name: "Tipo de Usuário" },
  { id: "cpf_hr", name: "CPF" },
  // Adicione outros campos de IdentitiesHR se necessário
];
// ======================== FIM DA CORREÇÃO (Atributos Estáticos) =========================


function GerenciarPoliticas() {
  const [controller] = useMaterialUIController(); 
  const { token } = controller; 

  const [activeTab, setActiveTab] = useState(0);

  // --- 1. Estados para carregar dados compartilhados ---
  const [isLoading, setIsLoading] = useState(true);
  const [allSystems, setAllSystems] = useState([]);
  const [allResources, setAllResources] = useState([]); 
  const [snackbar, setSnackbar] = useState({ open: false, color: "info", title: "", message: "" });
  
  // --- CORREÇÃO: URL CORRETA ---
  const API_URL = process.env.REACT_APP_API_URL;

  const api = axios.create({
    baseURL: API_URL,
    headers: { Authorization: `Bearer ${token}` },
  });

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  // --- 2. Função para buscar dados compartilhados ---
  const fetchSharedData = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
          // 1. Busca DataSources (que contêm os Sistemas)
          const systemsPromise = api.get('/systems'); // Usa a instância configurada
          
          // 2. Busca TODOS os Recursos (Perfis de Sistema)
          // Se essa rota não existir no backend, vai dar 404 e cair no catch
          const resourcesPromise = api.get('/resources'); // Ajustei para /resources (rota padrão REST) ou /systems/all-resources se vc criou custom

          const [systemsRes, resourcesRes] = await Promise.all([
              systemsPromise,
              resourcesPromise
          ]);

          // Processa a lista de Sistemas (extrai da DataSource e remove duplicatas)
          const systemsMap = new Map();
          // Blindagem de array
          const safeSystemsData = Array.isArray(systemsRes.data) ? systemsRes.data : [];
          
          safeSystemsData
            .filter(ds => ds.origem_datasource === 'SISTEMA' && ds.systemConfig?.system)
            .forEach(ds => {
              const sys = ds.systemConfig.system;
              if (!systemsMap.has(sys.id)) {
                // Armazena o objeto de Sistema do schema
                systemsMap.set(sys.id, { id: sys.id, name: sys.name_system }); 
              }
            });
          
          setAllSystems(Array.from(systemsMap.values()));
          
          // Blindagem de Recursos
          const safeResources = Array.isArray(resourcesRes.data) ? resourcesRes.data : [];
          setAllResources(safeResources);
          
      } catch (error) {
          console.error("Erro ao buscar dados compartilhados para Políticas:", error);
          // Não bloqueia a tela, apenas avisa. Permite tentar usar o que carregou.
          setSnackbar({ open: true, color: "warning", title: "Aviso", message: "Alguns dados auxiliares não puderam ser carregados." });
          setAllSystems([]);
          setAllResources([]);
      } finally {
          setIsLoading(false);
      }
  };

  // --- 3. useEffect para chamar a busca ---
  useEffect(() => {
      if (token) {
          fetchSharedData();
      }
  }, [token]);

  const closeSnackbar = () => setSnackbar({ ...snackbar, open: false });

  return (
    <DashboardLayout>
      <DashboardNavbar />
      <MDBox pt={6} pb={3}>
        <Grid container spacing={6}>
          <Grid item xs={12}>
            <Card>
              {/* Cabeçalho com o Título e o Seletor de Abas */}
              <MDBox
                mx={2}
                mt={-3}
                py={3}
                px={2}
                variant="gradient"
                bgColor="info"
                borderRadius="lg"
                coloredShadow="info"
              >
                <MDTypography variant="h6" color="white" mb={2}>
                  Gerenciamento de Políticas
                </MDTypography>
                <Tabs
                  value={activeTab}
                  onChange={handleTabChange}
                  textColor="inherit"
                  indicatorColor="secondary"
                  aria-label="Abas de Políticas"
                >
                  <Tab
                    label="RBAC (Regras de Concessão)"
                    icon={<Icon fontSize="small">verified_user</Icon>}
                    iconPosition="start"
                  />
                  <Tab
                    label="SOD (Segregação de Funções)"
                    icon={<Icon fontSize="small">gpp_bad</Icon>}
                    iconPosition="start"
                  />
                </Tabs>
              </MDBox>

              {/* --- 4. Renderização Condicional do Conteúdo --- */}
              <MDBox>
                {isLoading ? (
                    // Mostra loading centralizado
                    <MDBox p={5} display="flex" justifyContent="center" alignItems="center" minHeight="300px">
                        <CircularProgress color="info" />
                        <MDTypography variant="body2" color="text" sx={{ ml: 2 }}>
                            Carregando dados (Sistemas, Recursos)...
                        </MDTypography>
                    </MDBox>
                ) : (
                    // Renderiza as abas APENAS se os dados estiverem prontos
                    <>
                      {/* Painel RBAC */}
                      <TabPanel value={activeTab} index={0}>
                        <RbacTab 
                          // Passa os dados compartilhados como props
                          allSystems={allSystems}
                          allResources={allResources} 
                          allAttributes={allAttributes} 
                        />
                      </TabPanel>

                      {/* Painel SOD */}
                      <TabPanel value={activeTab} index={1}>
                        <SodTab 
                          // Passa os dados compartilhados como props
                          allSystems={allSystems}
                          allResources={allResources} 
                          allAttributes={allAttributes} 
                        />
                      </TabPanel>
                    </>
                )}
              </MDBox>
              {/* --- Fim da Modificação --- */}
            </Card>
          </Grid>
        </Grid>
      </MDBox>

      {/* Snackbar para erros de carregamento */}
      <MDSnackbar
        color={snackbar.color}
        icon={snackbar.color === "error" ? "warning" : "notifications"}
        title={snackbar.title}
        content={snackbar.message}
        dateTime="agora"
        open={snackbar.open}
        onClose={closeSnackbar}
        close={closeSnackbar}
      />
    </DashboardLayout>
  );
}

export default GerenciarPoliticas;