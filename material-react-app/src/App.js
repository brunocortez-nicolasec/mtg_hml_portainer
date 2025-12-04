import { useState, useEffect, useMemo } from "react";
import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { ThemeProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import Sidenav from "examples/Sidenav";
import Configurator from "examples/Configurator";
import theme from "assets/theme";
import themeRTL from "assets/theme/theme-rtl";
import themeDark from "assets/theme-dark";
import themeDarkRTL from "assets/theme-dark/theme-rtl";
import rtlPlugin from "stylis-plugin-rtl";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import routes from "routes";
import { useMaterialUIController, setMiniSidenav, setOpenConfigurator, logout, setAuth } from "context";
import { DashboardProvider } from "context/DashboardContext";
import axios from "axios"; 

// --- KEYCLOAK IMPORTS ---
import { ReactKeycloakProvider, useKeycloak } from "@react-keycloak/web";
import keycloak from "./keycloak";
// ------------------------

// --- UI IMPORTS ---
import CircularProgress from "@mui/material/CircularProgress";
import Box from "@mui/material/Box";
import brandWhite from "assets/images/mtg_icon_branco.png"; 
import brandDark from "assets/images/mtg_icon_azul.png"; 
// ------------------

import { setupAxiosInterceptors } from "./services/interceptor";
import ProtectedRoute from "examples/ProtectedRoute";
import UserProfile from "layouts/user-profile";
import UserManagement from "layouts/user-management";
import MapeamentoDados from "layouts/observabilidade/mapeamentoDados";
import ForcePasswordChange from "components/ForcePasswordChange";

// --- COMPONENTE 1: Sincronizador de Lógica (CORRIGIDO) ---
const KeycloakLogicSync = () => {
  const { keycloak, initialized } = useKeycloak();
  const [controller, dispatch] = useMaterialUIController();

  useEffect(() => {
    // Só roda se o Keycloak estiver pronto e autenticado
    if (initialized && keycloak.authenticated) {
        
        // 1. Garante o Header Global do Axios
        axios.defaults.headers.common['Authorization'] = `Bearer ${keycloak.token}`;

        // 2. Verifica se precisamos sincronizar
        // Condição: Token mudou OU Usuário no contexto está vazio/incompleto
        const isUserInvalid = !controller.user || !controller.user.email;
        const isTokenChanged = controller.token !== keycloak.token;

        if (isTokenChanged || isUserInvalid) {
           console.log(">>> [SYNC] Iniciando sincronização...");
           
           const syncUser = async () => {
             try {
               // --- CORREÇÃO DE URL: Usar a URL completa da API ---
               // Isso evita que o request bata no Frontend e retorne HTML
               const apiUrl = process.env.REACT_APP_API_URL;
               console.log(`>>> [SYNC] Buscando em: ${apiUrl}/me`);
               
               const response = await axios.get(`${apiUrl}/me`);
               // ------------------------------------------------
               
               console.log(">>> [SYNC] Resposta bruta da API:", response.data);

               // --- LÓGICA DE EXTRAÇÃO E ACHATAMENTO ---
               const backendData = response.data.data; // Formato JSON:API
               let userFormatted = null;

               if (backendData && backendData.attributes) {
                   // Formato Novo (JSON:API) -> Tira de attributes e põe na raiz
                   userFormatted = {
                     id: backendData.id,
                     ...backendData.attributes
                   };
               } else {
                   // Formato Antigo ou Plano (Fallback)
                   userFormatted = response.data;
               }
               
               console.log(">>> [SYNC] Atualizando Contexto com:", userFormatted);
               
               // ATUALIZA O CONTEXTO GLOBAL
               setAuth(dispatch, { token: keycloak.token, user: userFormatted });

             } catch (error) {
               console.error(">>> [SYNC] ERRO FATAL ao buscar usuário:", error);
               
               // Fallback Visual para não travar a tela em loading
               const basicUser = {
                 name: keycloak.tokenParsed?.name || "Usuário (Erro API)",
                 email: keycloak.tokenParsed?.email,
                 profile: { name: "Erro" },
                 mustChangePassword: false,
                 role: "Visitante" 
               };
               // Só sobrescreve se não tiver usuário nenhum ainda
               if (!controller.user) {
                   setAuth(dispatch, { token: keycloak.token, user: basicUser });
               }
             }
           };
           syncUser();
        } 
    } else if (initialized && !keycloak.authenticated) {
        // Se não autenticado, garante limpeza
        if (controller.token) {
           logout(dispatch);
        }
    }
  }, [initialized, keycloak, keycloak.authenticated, dispatch, controller.token, controller.user]);

  return null;
};

// --- COMPONENTE 2: O Guarda de Renderização ---
const KeycloakLoadingGuard = ({ children }) => {
  const { initialized } = useKeycloak();

  if (!initialized) {
    return (
      <Box sx={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <CircularProgress size={60} color="info" />
      </Box>
    );
  }

  return children;
};


// --- APP PRINCIPAL ---
export default function App() {
  const [controller, dispatch] = useMaterialUIController();
  const {
    miniSidenav,
    direction,
    layout,
    openConfigurator,
    sidenavColor,
    transparentSidenav,
    whiteSidenav,
    darkMode,
    token,
  } = controller;

  const [onMouseEnter, setOnMouseEnter] = useState(false);
  const [rtlCache, setRtlCache] = useState(null);
  const { pathname } = useLocation();
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    setIsDemo(process.env.REACT_APP_IS_DEMO === "true");
  }, []);

  useMemo(() => {
    const cacheRtl = createCache({
      key: "rtl",
      stylisPlugins: [rtlPlugin],
    });
    setRtlCache(cacheRtl);
  }, []);

  const handleOnMouseEnter = () => {
    if (miniSidenav && !onMouseEnter) {
      setMiniSidenav(dispatch, false);
      setOnMouseEnter(true);
    }
  };

  const handleOnMouseLeave = () => {
    if (onMouseEnter) {
      setMiniSidenav(dispatch, true);
      setOnMouseEnter(false);
    }
  };

  const navigate = useNavigate();

  // Interceptador para login manual (caso o axios receba 401 do keycloak)
  setupAxiosInterceptors(() => {
      logout(dispatch);
      keycloak.login();
  });

  useEffect(() => {
    document.body.setAttribute("dir", direction);
  }, [direction]);

  useEffect(() => {
    document.documentElement.scrollTop = 0;
    document.scrollingElement.scrollTop = 0;
  }, [pathname]);

  const getRoutes = (allRoutes) =>
    allRoutes.map((route) => {
      if (route.collapse) {
        return getRoutes(route.collapse);
      }
      if (route.route && route.type !== "auth") {
        return (
          <Route
            exact
            path={route.route}
            element={
              <ProtectedRoute isAuthenticated={!!token}>
                {route.component}
              </ProtectedRoute>
            }
            key={route.key}
          />
        );
      }
      return null;
    });

  const keycloakInitOptions = {
    onLoad: 'login-required',
    checkLoginIframe: false, 
    pkceMethod: 'S256',
  };

  const MainContent = (
    <ThemeProvider theme={darkMode ? direction === "rtl" ? themeDarkRTL : themeDark : direction === "rtl" ? themeRTL : theme}>
        <CssBaseline />
        {layout === "dashboard" && (
          <>
            <Sidenav
              color={sidenavColor}
              brand={(transparentSidenav && !darkMode) || whiteSidenav ? brandDark : brandWhite}
              routes={routes}
              onMouseEnter={handleOnMouseEnter}
              onMouseLeave={handleOnMouseLeave}
            />
            <Configurator />
          </>
        )}
        {layout === "vr" && <Configurator />}
        
        <DashboardProvider>
          {token && <ForcePasswordChange />}
          <Routes>
            <Route exact path="user-profile" element={<ProtectedRoute isAuthenticated={!!token}><UserProfile /></ProtectedRoute>} key="user-profile" />
            <Route exact path="user-management" element={<ProtectedRoute isAuthenticated={!!token}><UserManagement /></ProtectedRoute>} key="user-management" />
            <Route exact path="/observabilidade/mapeamento-dados/:id" element={<ProtectedRoute isAuthenticated={!!token}><MapeamentoDados /></ProtectedRoute>} key="mapeamento-dados-id" />
            
            {getRoutes(routes)}
            
            <Route path="*" element={<Navigate to="/dashboard" />} />
          </Routes>
        </DashboardProvider>
    </ThemeProvider>
  );

  return (
    <ReactKeycloakProvider authClient={keycloak} initOptions={keycloakInitOptions}>
      {/* Executa a lógica de sync com URL corrigida */}
      <KeycloakLogicSync />
      
      <KeycloakLoadingGuard>
         {direction === "rtl" ? (
             <CacheProvider value={rtlCache}>
                {MainContent}
             </CacheProvider>
         ) : (
             MainContent
         )}
      </KeycloakLoadingGuard>
    </ReactKeycloakProvider>
  );
}