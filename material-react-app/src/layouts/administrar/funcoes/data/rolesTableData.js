// src/layouts/administrar/funcoes/data/rolesTableData.js

import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";

// Componente para os botões de Ação (Editar/Deletar)
function Action({ onEdit, onDelete }) {
  return (
    <MDBox>
      <MDTypography onClick={onEdit} component="a" href="#" variant="caption" color="text" fontWeight="medium" mr={2}>
        Editar
      </MDTypography>
      <MDTypography onClick={onDelete} component="a" href="#" variant="caption" color="error" fontWeight="medium">
        Deletar
      </MDTypography>
    </MDBox>
  );
}

// Função principal que formata os dados
export default function data(roles, handleEdit, handleDelete) {
  const columns = [
    { Header: "nome da função", accessor: "name", width: "50%", align: "left" },
    { Header: "criado em", accessor: "created", align: "center" },
    { Header: "ação", accessor: "action", align: "center" },
  ];

  // --- BLINDAGEM: (roles || []) ---
  // Garante que o map não quebra se roles for nulo
  const rows = (roles || []).map(role => ({
    name: (
      <MDTypography component="a" href="#" variant="button" color="text" fontWeight="medium">
        {role.name}
      </MDTypography>
    ),
    created: (
      <MDTypography variant="caption">
        {new Date(role.createdAt).toLocaleDateString()}
      </MDTypography>
    ),
    action: <Action onEdit={() => handleEdit(role)} onDelete={() => handleDelete(role.id)} />,
  }));

  return { columns, rows };
}