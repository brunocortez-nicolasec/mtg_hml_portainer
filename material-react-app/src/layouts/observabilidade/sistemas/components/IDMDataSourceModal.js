// material-react-app/src/layouts/observabilidade/sistemas/components/IDMDataSourceModal.js

import { useState, useEffect } from "react";
import PropTypes from "prop-types";
// Importe axios se for adicionar testes de API ou DB no futuro

// @mui material components
import Modal from "@mui/material/Modal";
import Card from "@mui/material/Card";
import Grid from "@mui/material/Grid";

// Material Dashboard 2 React components
import MDBox from "components/MDBox";
import MDTypography from "components/MDTypography";
import MDInput from "components/MDInput";
import MDButton from "components/MDButton";

// Este modal não possui steps nem testes de conexão por enquanto.

function IDMDataSourceModal({ open, onClose, onSave, initialData }) {
  
  const defaultState = {
    name: "",
    origem: "IDM", 
    description: "",
    // Campos específicos de IDM (futuros: API keys, etc.)
  };

  const [formData, setFormData] = useState(defaultState);
  
  // Carrega dados iniciais ao abrir o modal
  useEffect(() => {
    if (open) {
      if (initialData) {
        setFormData({
            ...defaultState,
            name: initialData.name_datasource || "",
            description: initialData.description_datasource || "",
        });
      } else {
        setFormData(defaultState);
      }
    }
  }, [initialData, open]);


  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };
  
  const getSaveDisabled = () => {
    return !formData.name;
  };
  
  const handleSave = () => {
    // Passa os dados para a função de salvamento do componente pai
    onSave(formData); 
  };
  
  return (
    <Modal open={open} onClose={onClose} sx={{ display: "grid", placeItems: "center" }}>
      <Card sx={{ width: "90%", maxWidth: "600px", overflowY: "auto", maxHeight: "90vh" }}>
        <MDBox p={3}>
          <MDTypography variant="h5">{initialData ? "Editar" : "Adicionar"} Fonte de Dados IDM</MDTypography>
          <MDTypography variant="caption" color="text">Origem: IDM</MDTypography>
        </MDBox>
        <MDBox component="form" p={3} pt={0}>
            <Grid container spacing={3}>
                <Grid item xs={12}>
                    <MDInput label="Nome" name="name" value={formData.name} onChange={handleInputChange} fullWidth autoFocus />
                </Grid>
                <Grid item xs={12}>
                    <MDInput label="Descrição (Opcional)" name="description" value={formData.description} onChange={handleInputChange} fullWidth multiline rows={3} />
                </Grid>
                
                {/* Aqui virão campos de configuração IDM quando necessário */}
                <Grid item xs={12}>
                    <MDTypography variant="caption" color="text">
                        Configurações de integração IDM (API/DB) serão adicionadas aqui.
                    </MDTypography>
                </Grid>
            </Grid>
            
            <MDBox mt={4} display="flex" justifyContent="flex-end">
                <MDButton variant="gradient" color="secondary" onClick={onClose} sx={{ mr: 2 }}>Cancelar</MDButton>
                <MDButton variant="gradient" color="info" onClick={handleSave} disabled={getSaveDisabled()}>
                    Salvar
                </MDButton>
            </MDBox>
        </MDBox>
      </Card>
    </Modal>
  );
}

IDMDataSourceModal.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onSave: PropTypes.func.isRequired,
  initialData: PropTypes.object,
};

IDMDataSourceModal.defaultProps = {
  initialData: null,
};

export default IDMDataSourceModal;