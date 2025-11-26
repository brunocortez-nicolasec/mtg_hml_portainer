// src/layouts/administrar/grupos/data/groupsTableData.js

import MDTypography from "components/MDTypography";
import MDBox from "components/MDBox";

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

export default function data(groups, onNameClick, handleEdit, handleDelete) {
  const columns = [
    { Header: "nome do grupo", accessor: "name", width: "50%", align: "left" },
    { Header: "nº de membros", accessor: "members", align: "center" },
    { Header: "criado em", accessor: "created", align: "center" },
    { Header: "ação", accessor: "action", align: "center" },
  ];

  // --- BLINDAGEM 1: Array principal (groups) ---
  // Garante que não quebra se groups vier nulo/undefined
  const rows = (groups || []).map(group => ({
    name: (
      <MDTypography
        onClick={() => onNameClick(group)}
        component="a"
        href="#"
        variant="button"
        color="info" 
        fontWeight="medium"
        sx={{ cursor: "pointer" }}
      >
        {group.name}
      </MDTypography>
    ),
    members: (
      <MDTypography variant="caption">
        {/* --- BLINDAGEM 2: Objeto aninhado (_count) --- */}
        {group._count?.users || 0}
      </MDTypography>
    ),
    created: (
      <MDTypography variant="caption">
        {new Date(group.createdAt).toLocaleDateString()}
      </MDTypography>
    ),
    action: <Action onEdit={() => handleEdit(group)} onDelete={() => handleDelete(group.id)} />,
  }));

  return { columns, rows };
}